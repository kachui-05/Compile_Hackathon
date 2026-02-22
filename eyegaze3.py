import cv2
import mediapipe as mp
import numpy as np
import time
from collections import deque
import asyncio
import websockets
import threading

connected_clients = set()

async def handler(websocket):
    connected_clients.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        connected_clients.discard(websocket)

async def start_server():
    async with websockets.serve(handler, "localhost", 6789):
        await asyncio.get_event_loop().run_forever()

def run_server():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(start_server())

threading.Thread(target=run_server, daemon=True).start()

def broadcast(msg):
    for ws in list(connected_clients):
        asyncio.run_coroutine_threadsafe(ws.send(msg), asyncio.get_event_loop())

mp_face_mesh = mp.solutions.face_mesh

# Eye landmarks (left, right, top, bottom)
LEFT_EYE   = [33, 133, 159, 145]
RIGHT_EYE  = [362, 263, 386, 374]
LEFT_IRIS  = [468]
RIGHT_IRIS = [473]

# Head pose landmarks
NOSE_TIP     = 4
LEFT_TEMPLE  = 234
RIGHT_TEMPLE = 454

DISTRACTION_TIME   = 15.0
CALIBRATION_FRAMES = 60
GAZE_HISTORY       = deque(maxlen=10)

away_start        = None
focus_mode_active = False
calibration_data  = []
calibrated        = False
h_center          = 0.5


# ── Helpers ───────────────────────────────────────────────────────

def pt(mesh, i, w, h):
    return np.array([mesh[i].x * w, mesh[i].y * h])

def gaze_ratio_2d(iris, eye_landmarks):
    left, right, top, bottom = eye_landmarks
    h_ratio = np.linalg.norm(iris - left)  / np.linalg.norm(right - left)
    v_ratio = np.linalg.norm(iris - top)   / np.linalg.norm(bottom - top)
    return h_ratio, v_ratio

def eye_aspect_ratio(top, bottom, left, right):
    return np.linalg.norm(top - bottom) / np.linalg.norm(left - right)

def head_turned(mesh, threshold=0.25):
    nose  = np.array([mesh[NOSE_TIP].x,     mesh[NOSE_TIP].y])
    left  = np.array([mesh[LEFT_TEMPLE].x,  mesh[LEFT_TEMPLE].y])
    right = np.array([mesh[RIGHT_TEMPLE].x, mesh[RIGHT_TEMPLE].y])
    face_center_x = (left[0] + right[0]) / 2
    face_width    = np.linalg.norm(right - left)
    offset        = abs(nose[0] - face_center_x) / face_width
    return offset > threshold


# ── Main ──────────────────────────────────────────────────────────

cap = cv2.VideoCapture(0)

with mp_face_mesh.FaceMesh(
    refine_landmarks=True,
    max_num_faces=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
) as face_mesh:

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        h, w    = frame.shape[:2]
        rgb     = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb)

        distracted = False

        if results.multi_face_landmarks:
            mesh = results.multi_face_landmarks[0].landmark

            # ── Blink / eyes-closed check ─────────────────────────
            ear_left  = eye_aspect_ratio(pt(mesh, 159, w, h), pt(mesh, 145, w, h), pt(mesh, 33, w, h),  pt(mesh, 133, w, h))
            ear_right = eye_aspect_ratio(pt(mesh, 386, w, h), pt(mesh, 374, w, h), pt(mesh, 362, w, h), pt(mesh, 263, w, h))
            ear = (ear_left + ear_right) / 2

            if ear < 0.15:
                GAZE_HISTORY.clear()
                cv2.putText(frame, "EYES CLOSED", (30, 50),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (200, 200, 0), 3)
                cv2.imshow("Distraction Detector", frame)
                cv2.waitKey(1)
                continue

            # ── Gaze ─────────────────────────────────────────────
            left_h,  left_v  = gaze_ratio_2d(pt(mesh, LEFT_IRIS[0], w, h),  [pt(mesh, i, w, h) for i in LEFT_EYE])
            right_h, right_v = gaze_ratio_2d(pt(mesh, RIGHT_IRIS[0], w, h), [pt(mesh, i, w, h) for i in RIGHT_EYE])

            gaze_h = (left_h + right_h) / 2
            gaze_v = (left_v + right_v) / 2
            GAZE_HISTORY.append((gaze_h, gaze_v))

            avg_h = np.mean([g[0] for g in GAZE_HISTORY])
            avg_v = np.mean([g[1] for g in GAZE_HISTORY])

            # ── Calibration phase ─────────────────────────────────
            if not calibrated:
                calibration_data.append(avg_h)
                progress = len(calibration_data)
                cv2.putText(frame, f"Calibrating... {progress}/{CALIBRATION_FRAMES}",
                            (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 0), 2)
                cv2.putText(frame, "Look at the center of your screen",
                            (30, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

                if progress >= CALIBRATION_FRAMES:
                    h_center   = np.mean(calibration_data)
                    calibrated = True
                    print(f"Calibration complete. h_center={h_center:.3f}")

                cv2.imshow("Distraction Detector", frame)
                cv2.waitKey(1)
                continue

            # ── Distraction checks ────────────────────────────────
            gaze_distracted = avg_h < h_center - 0.15 or avg_h > h_center + 0.15 or avg_v > 0.70
            head_distracted = head_turned(mesh)
            distracted      = gaze_distracted or head_distracted

        else:
            distracted = True

        # ── Timing + focus trigger ────────────────────────────────
        now = time.time()
        if distracted:
            if away_start is None:
                away_start = now
            elapsed = now - away_start

            if elapsed > DISTRACTION_TIME and not focus_mode_active:
                focus_mode_active = True
                broadcast("ENABLE_FOCUS")

            status = "DISTRACTED" if elapsed > 2.0 else "LOOKING AWAY"
        else:
            if focus_mode_active:
                focus_mode_active = False
                broadcast("DISABLE_FOCUS")
            away_start = None
            status = "FOCUSED"

        # ── Display ───────────────────────────────────────────────
        color = (0, 0, 255) if "DISTRACTED" in status else (0, 255, 0)
        cv2.putText(frame, status, (30, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3)

        if calibrated:
            cv2.putText(frame, f"h:{avg_h:.2f} v:{avg_v:.2f}", (30, 90),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        cv2.imshow("Distraction Detector", frame)
        if cv2.waitKey(1) & 0xFF == 27:
            break

cap.release()
cv2.destroyAllWindows()
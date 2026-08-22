#!/usr/bin/env python
import os
import signal
import subprocess
import sys
from pathlib import Path


def start_companion_services():
    project_dir = Path(__file__).resolve().parents[1]
    services = [
        ("Frontend", project_dir / "frontend"),
        ("WhatsApp service", project_dir / "whatsapp-service"),
    ]
    child_processes = []

    for service_name, working_dir in services:
        if not working_dir.is_dir():
            print(f"Skipping {service_name}: {working_dir} does not exist", file=sys.stderr)
            continue

        print(f"Starting {service_name}...", flush=True)
        command = ["cmd.exe", "/c", "npm", "run", "dev"] if os.name == "nt" else ["npm", "run", "dev"]
        child_processes.append(
            subprocess.Popen(
                command,
                cwd=working_dir,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
            )
        )

    return child_processes


def stop_companion_services(child_processes):
    for process in child_processes:
        if process.poll() is not None:
            continue

        try:
            if os.name == "nt":
                process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                process.terminate()
            process.wait(timeout=5)
        except (OSError, subprocess.TimeoutExpired):
            process.kill()

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gj_events_api.settings")
    companion_processes = []
    is_runserver = sys.argv[1:2] == ["runserver"]
    is_reloader_worker = os.environ.get("RUN_MAIN") == "true"
    uses_reloader = "--noreload" not in sys.argv
    should_start_companions = is_runserver and (not uses_reloader or is_reloader_worker)

    if should_start_companions:
        companion_processes = start_companion_services()

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and available on your PYTHONPATH environment variable?"
        ) from exc

    try:
        execute_from_command_line(sys.argv)
    finally:
        stop_companion_services(companion_processes)

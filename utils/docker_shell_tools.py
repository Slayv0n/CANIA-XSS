import subprocess
from typing import Optional

class DockerShellTools:
    """Инструменты для выполнения команд в Docker-контейнере cania-xss-runner"""
    
    def __init__(self, container_name: str = "cania-xss-runner"):
        self.container_name = container_name
    
    def run_docker_command(self, command: str) -> str:
        docker_command = ["docker", "exec", self.container_name, "bash", "-c", command]
        try:
            result = subprocess.run(docker_command, capture_output=True, text=True, check=True, timeout=120)
            output = result.stdout.strip()
            output = output.replace('\\', '\\\\').replace('\n', '\\n').replace('\r', '').replace('"', '\\"')
            return output[:8000]
        except subprocess.TimeoutExpired:
            return "COMMAND_ERROR: TIMEOUT"
        except subprocess.CalledProcessError as e:
            stderr = (e.stderr or "").strip().replace('\\', '\\\\').replace('\n', '\\n').replace('"', '\\"')
            return f"COMMAND_ERROR: {stderr[:200]}"
        except Exception as e:
            return f"COMMAND_ERROR: {str(e)[:100]}"
    
    def check_container_running(self) -> bool:
        """Проверяет, запущен ли целевой контейнер"""
        try:
            result = subprocess.run(
                ["docker", "ps", "--filter", f"name={self.container_name}", "--format", "{{.Status}}"],
                capture_output=True, text=True, check=True, timeout=10
            )
            return "Up" in result.stdout
        except Exception:
            return False
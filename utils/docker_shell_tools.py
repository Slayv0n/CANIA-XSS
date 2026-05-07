import subprocess

class DockerShellTools:
    def __init__(self, container_name: str = "cania-xss-runner"):
        self.container_name = container_name

    def run_docker_command(self, command: str) -> str:
        """Выполняет команду внутри Docker-контейнера."""
        docker_command = ["docker", "exec", self.container_name, "bash", "-c", command]
        try:
            result = subprocess.run(
                docker_command,
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            return f"Ошибка: {e.stderr.strip()}"
        except Exception as e:
            return f"Ошибка Docker: {str(e)}"

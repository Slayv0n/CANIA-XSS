# ai_agent_scraper/ai_agent_scraper.py

from agno.agent import Agent
from agno.tools import Toolkit
from agno.tools.shell import ShellTools
from agno.utils.log import logger
import re
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

class DataParserToolkit(Toolkit):
    """Toolkit для парсинга результатов OSINT сканирования"""

    def __init__(self, results_dir: str = "execution_results", **kwargs):
        """
        Инициализация toolkit для парсинга

        Args:
            results_dir (str): Директория для сохранения результатов
        """
        self.results_dir = Path(results_dir)
        self.results_dir.mkdir(exist_ok=True)

        # Определяем инструменты
        tools = [
            self.parse_nmap_output,
            self.parse_gobuster_output,
            self.parse_whatweb_output,
            self.parse_nikto_output,
            self.extract_all_data,
            self.format_for_report,
            self.save_parsed_results,
        ]

        super().__init__(name="data_parser_toolkit", tools=tools, **kwargs)

    def parse_nmap_output(self, output: str) -> Dict[str, Any]:
        """
        Парсит вывод nmap сканирования.

        Извлекает открытые порты, сервисы, версии ОС.

        Args:
            output (str): Вывод команды nmap

        Returns:
            Dict[str, Any]: Структурированные данные
        """
        logger.info("Парсинг nmap вывода")

        result = {
            "open_ports": [],
            "services": [],
            "os_guess": None
        }

        try:
            # Парсим открытые порты
            port_pattern = r'(\d+)/(tcp|udp)\s+(open|filtered)\s+(\S+)'
            for match in re.finditer(port_pattern, output):
                port, protocol, state, service = match.groups()
                port_info = {
                    "port": int(port),
                    "protocol": protocol,
                    "state": state,
                    "service": service
                }
                result["open_ports"].append(port_info)

                if state == "open":
                    result["services"].append({
                        "port": int(port),
                        "service": service,
                        "protocol": protocol
                    })

            # Определение ОС
            os_pattern = r'OS guess:\s+(.+?)(?:\n|$)'
            os_match = re.search(os_pattern, output)
            if os_match:
                result["os_guess"] = os_match.group(1).strip()

        except Exception as e:
            logger.error(f"Ошибка парсинга nmap: {e}")
            result["error"] = str(e)

        return result

    def parse_gobuster_output(self, output: str) -> Dict[str, Any]:
        """
        Парсит вывод gobuster dir/dns.

        Извлекает найденные директории и определяет критичные пути.

        Args:
            output (str): Вывод команды gobuster

        Returns:
            Dict[str, Any]: Структурированные данные
        """
        logger.info("Парсинг gobuster вывода")

        result = {
            "directories": [],
            "files": [],
            "critical_finds": []
        }

        # Критичные пути
        critical_paths = [
            'admin', 'phpmyadmin', 'wp-admin', 'backup', '.git', '.env',
            'config', 'sql', 'database', 'login', 'panel', 'console'
        ]

        try:
            dir_pattern = r'/(\S+)\s+\(Status:\s+(\d+)\)'
            for match in re.finditer(dir_pattern, output):
                path, status = match.groups()
                full_path = f"/{path}"
                status_code = int(status)

                item = {
                    "path": full_path,
                    "status": status_code,
                    "type": "directory" if status_code == 200 else "redirect"
                }

                path_lower = full_path.lower()
                is_critical = any(critical in path_lower for critical in critical_paths)

                if status_code == 200:
                    result["directories"].append(item)
                    if is_critical:
                        result["critical_finds"].append({
                            "path": full_path,
                            "type": "critical_directory",
                            "reason": f"Critical directory exposed with status {status_code}"
                        })
                elif status_code in [301, 302, 307, 308]:
                    result["directories"].append({**item, "redirect": True})
                else:
                    result["files"].append(item)

        except Exception as e:
            logger.error(f"Ошибка парсинга gobuster: {e}")
            result["error"] = str(e)

        return result

    def parse_whatweb_output(self, output: str) -> Dict[str, Any]:
        """
        Парсит вывод whatweb для определения технологий.

        Args:
            output (str): Вывод команды whatweb

        Returns:
            Dict[str, Any]: Структурированные данные
        """
        logger.info("Парсинг whatweb вывода")

        result = {
            "technologies": [],
            "server": None,
            "cms": None,
            "frameworks": []
        }

        try:
            tech_pattern = r'\[(.*?)\]'
            for match in re.finditer(tech_pattern, output):
                tech = match.group(1)
                result["technologies"].append(tech)

                # Определяем CMS
                cms_list = ['WordPress', 'Joomla', 'Drupal', 'Magento', 'Shopify']
                for cms in cms_list:
                    if cms.lower() in tech.lower():
                        result["cms"] = tech
                        break

                # Определяем фреймворки
                frameworks = ['Laravel', 'Django', 'Rails', 'Symfony', 'Express']
                for fw in frameworks:
                    if fw.lower() in tech.lower():
                        result["frameworks"].append(tech)

            # Поиск сервера
            server_pattern = r'Server:\s+(\S+)'
            server_match = re.search(server_pattern, output)
            if server_match:
                result["server"] = server_match.group(1)

        except Exception as e:
            logger.error(f"Ошибка парсинга whatweb: {e}")
            result["error"] = str(e)

        return result

    def parse_nikto_output(self, output: str) -> Dict[str, Any]:
        """
        Парсит вывод nikto и классифицирует уязвимости.

        Args:
            output (str): Вывод команды nikto

        Returns:
            Dict[str, Any]: Структурированные данные
        """
        logger.info("Парсинг nikto вывода")

        result = {
            "vulnerabilities": {
                "critical": [],
                "danger": [],
                "info": []
            },
            "risk_level": "low"
        }

        try:
            vuln_pattern = r'\+ (?:OSVDB-\d+: )?(.+?):\s*(.+?)(?:\n|$)'
            for match in re.finditer(vuln_pattern, output):
                title, details = match.groups()
                risk = "info"

                critical_keywords = [
                    'vulnerable', 'exploit', 'cve', 'injection', 'rce',
                    'remote code', 'arbitrary', 'bypass'
                ]
                danger_keywords = [
                    'outdated', 'exposed', 'directory', 'file', 'config',
                    'information disclosure'
                ]

                title_lower = title.lower()
                if any(key in title_lower for key in critical_keywords):
                    risk = "critical"
                elif any(key in title_lower for key in danger_keywords):
                    risk = "danger"

                result["vulnerabilities"][risk].append({
                    "title": title.strip(),
                    "details": details.strip()
                })

            if result["vulnerabilities"]["critical"]:
                result["risk_level"] = "critical"
            elif result["vulnerabilities"]["danger"]:
                result["risk_level"] = "danger"

        except Exception as e:
            logger.error(f"Ошибка парсинга nikto: {e}")
            result["error"] = str(e)

        return result

    def extract_all_data(self, target: str, scan_outputs: Dict[str, str]) -> Dict[str, Any]:
        """
        Извлекает все данные из результатов сканирования.

        Args:
            target (str): Цель сканирования
            scan_outputs (Dict[str, str]): Словарь с выводами инструментов

        Returns:
            Dict[str, Any]: Полная структурированная информация
        """
        logger.info(f"Извлечение всех данных для {target}")

        results = {
            "target": target,
            "timestamp": datetime.now().isoformat(),
            "nmap": {},
            "gobuster": {},
            "whatweb": {},
            "nikto": {},
            "summary": {
                "total_vulnerabilities": 0,
                "critical_count": 0,
                "danger_count": 0,
                "open_ports_count": 0,
                "technologies_count": 0,
                "directories_found": 0
            }
        }

        if "nmap" in scan_outputs and scan_outputs["nmap"]:
            nmap_data = self.parse_nmap_output(scan_outputs["nmap"])
            results["nmap"] = nmap_data
            results["summary"]["open_ports_count"] = len(nmap_data.get("open_ports", []))

        if "gobuster" in scan_outputs and scan_outputs["gobuster"]:
            gobuster_data = self.parse_gobuster_output(scan_outputs["gobuster"])
            results["gobuster"] = gobuster_data
            results["summary"]["directories_found"] = len(gobuster_data.get("directories", []))

        if "whatweb" in scan_outputs and scan_outputs["whatweb"]:
            whatweb_data = self.parse_whatweb_output(scan_outputs["whatweb"])
            results["whatweb"] = whatweb_data
            results["summary"]["technologies_count"] = len(whatweb_data.get("technologies", []))

        if "nikto" in scan_outputs and scan_outputs["nikto"]:
            nikto_data = self.parse_nikto_output(scan_outputs["nikto"])
            results["nikto"] = nikto_data
            results["summary"]["critical_count"] = len(nikto_data.get("vulnerabilities", {}).get("critical", []))
            results["summary"]["danger_count"] = len(nikto_data.get("vulnerabilities", {}).get("danger", []))
            results["summary"]["total_vulnerabilities"] = (
                results["summary"]["critical_count"] +
                results["summary"]["danger_count"] +
                len(nikto_data.get("vulnerabilities", {}).get("info", []))
            )

        return results

    def format_for_report(self, parsed_data: Dict[str, Any]) -> str:
        """
        Форматирует распарсенные данные в читаемый отчет.

        Args:
            parsed_data (Dict[str, Any]): Данные из extract_all_data

        Returns:
            str: Форматированный отчет
        """
        report = []

        report.append(f"🎯 ЦЕЛЬ: {parsed_data.get('target', 'Unknown')}")
        report.append(f"🕐 ВРЕМЯ: {parsed_data.get('timestamp', 'Unknown')[:19]}")
        report.append("")

        # Открытые порты
        if parsed_data.get("nmap", {}).get("open_ports"):
            report.append("🔓 ОТКРЫТЫЕ ПОРТЫ:")
            for port in parsed_data["nmap"]["open_ports"][:10]:
                report.append(f"  - {port['port']}/{port['protocol']} ({port['service']})")
            report.append("")

        # Критические находки
        critical_finds = parsed_data.get("gobuster", {}).get("critical_finds", [])
        critical_vulns = parsed_data.get("nikto", {}).get("vulnerabilities", {}).get("critical", [])

        if critical_finds or critical_vulns:
            report.append("🔴 КРИТИЧЕСКИЕ НАХОДКИ:")
            for find in critical_finds[:5]:
                report.append(f"  - {find['path']} - {find['reason']}")
            for vuln in critical_vulns[:5]:
                report.append(f"  - {vuln['title']}")
            report.append("")

        # Технологии
        if parsed_data.get("whatweb", {}).get("technologies"):
            report.append("🛠 ТЕХНОЛОГИИ:")
            for tech in parsed_data["whatweb"]["technologies"][:10]:
                report.append(f"  - {tech}")
            if parsed_data["whatweb"].get("cms"):
                report.append(f"  📝 CMS: {parsed_data['whatweb']['cms']}")
            if parsed_data["whatweb"].get("server"):
                report.append(f"  🖥️ Сервер: {parsed_data['whatweb']['server']}")
            report.append("")

        # Статистика
        summary = parsed_data.get("summary", {})
        report.append("📊 СТАТИСТИКА:")
        report.append(f"  - Открытых портов: {summary.get('open_ports_count', 0)}")
        report.append(f"  - Найдено директорий: {summary.get('directories_found', 0)}")
        report.append(f"  - Технологий обнаружено: {summary.get('technologies_count', 0)}")
        report.append(f"  - Критических уязвимостей: {summary.get('critical_count', 0)}")
        report.append(f"  - Опасных находок: {summary.get('danger_count', 0)}")
        report.append(f"  - Всего уязвимостей: {summary.get('total_vulnerabilities', 0)}")

        return "\n".join(report)

    def save_parsed_results(self, parsed_data: Dict[str, Any]) -> str:
        """
        Сохраняет распарсенные результаты в JSON файл.

        Args:
            parsed_data (Dict[str, Any]): Данные для сохранения

        Returns:
            str: Путь к сохраненному файлу
        """
        target = parsed_data.get("target", "unknown")
        timestamp = parsed_data.get("timestamp", datetime.now().isoformat()).replace(":", "-")

        filename = f"{target}_{timestamp}_parsed.json"
        filepath = self.results_dir / filename

        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(parsed_data, f, ensure_ascii=False, indent=2)
            logger.info(f"Результаты сохранены в {filepath}")
            return f"✅ Результаты сохранены в {filepath}"
        except Exception as e:
            logger.error(f"Ошибка сохранения: {e}")
            return f"❌ Ошибка сохранения: {e}"

# Создаем парсер-агента
parser_agent = Agent(
    name='Data Parser',
    role='Парсинг и структурирование данных сканирования',
    tools=[DataParserToolkit(results_dir="execution_results")],
    instructions=[
        "ТЫ: Специалист по парсингу данных OSINT сканирования",

        "=== ДОСТУПНЫЕ ИНСТРУМЕНТЫ ===",
        "- parse_nmap_output: парсит вывод nmap (порты, сервисы)",
        "- parse_gobuster_output: парсит найденные директории",
        "- parse_whatweb_output: определяет технологии и CMS",
        "- parse_nikto_output: классифицирует уязвимости",
        "- extract_all_data: полный анализ всех данных",
        "- format_for_report: создает читаемый отчет",
        "- save_parsed_results: сохраняет JSON результат",

        "=== ПОРЯДОК РАБОТЫ ===",
        "1. Получи результаты сканирования (nmap, gobuster, whatweb, nikto)",
        "2. Вызови extract_all_data с целевым доменом и выводами",
        "3. Сохрани результаты через save_parsed_results",
        "4. Покажи отчет через format_for_report"
    ],
    markdown=True,
    debug_mode=False
)
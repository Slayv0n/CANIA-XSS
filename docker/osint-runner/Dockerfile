# Образ Kali Linux
FROM kalilinux/kali-rolling

# Инструменты
RUN apt update && apt install -y \
    nmap \
    gobuster \
    whatweb \
    whois \
    dnsutils \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /usr/share/wordlists/dirb/
COPY common.txt /usr/share/wordlists/dirb/common.txt

WORKDIR /app

CMD ["sleep", "infinity"]
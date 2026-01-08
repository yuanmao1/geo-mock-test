FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DISPLAY=:99 \
    CHROME_BIN=/usr/bin/google-chrome \
    HOST=0.0.0.0 \
    PORT=8000

WORKDIR /app
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# System deps: Chrome + Xvfb and runtime libs.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      gnupg \
      wget \
      xvfb \
      xauth \
      fonts-noto-cjk \
      fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Install google-chrome-stable from Google's apt repo.
RUN set -eux; \
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-chrome.gpg; \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends google-chrome-stable; \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
# 使用清华源加速 pip 安装
RUN pip install -r /app/requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

COPY . /app

EXPOSE 8000

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

# Setup directories
RUN mkdir -p /app/data /app/logs /app/user_data

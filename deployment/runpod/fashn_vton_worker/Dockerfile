FROM runpod/pytorch:1.0.2-cu1281-torch280-ubuntu2404

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DEBIAN_FRONTEND=noninteractive \
    FASHN_WEIGHTS_DIR=/opt/fashn-vton-weights

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt

RUN pip install --upgrade pip setuptools wheel \
    && pip install -r /app/requirements.txt

RUN git clone --depth 1 https://github.com/fashn-AI/fashn-vton-1.5.git /opt/fashn-vton \
    && pip install -e /opt/fashn-vton \
    && python /opt/fashn-vton/scripts/download_weights.py --weights-dir ${FASHN_WEIGHTS_DIR}

COPY handler.py /app/handler.py

CMD ["python", "-u", "/app/handler.py"]

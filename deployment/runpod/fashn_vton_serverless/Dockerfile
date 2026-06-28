# RunPod Serverless worker for FASHN VTON 1.5
# Weights are baked into the image for reliable, fast cold starts (FlashBoot-friendly).
#
# Build context: this directory (deployment/runpod/fashn_vton_serverless/)
# For gated Hugging Face weights, pass --build-arg HF_TOKEN=hf_xxx (or set it as a
# RunPod build secret when deploying from GitHub).

FROM pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    FASHN_REPO_DIR=/opt/fashn-vton-1.5 \
    FASHN_WEIGHTS_DIR=/weights \
    HF_HOME=/opt/hf-cache

# System deps required by the FASHN pipeline (OpenCV / image libs + git for clone).
RUN apt-get update \
    && apt-get install -y --no-install-recommends git libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Python deps for the serverless worker itself.
COPY requirements.txt /tmp/requirements.txt
RUN python -m pip install --upgrade pip setuptools wheel \
    && python -m pip install -r /tmp/requirements.txt

# Install the FASHN VTON package.
RUN git clone --depth 1 https://github.com/fashn-AI/fashn-vton-1.5.git ${FASHN_REPO_DIR} \
    && python -m pip install -e ${FASHN_REPO_DIR}

# Bake the model weights into the image so workers never download at runtime.
ARG HF_TOKEN=""
RUN mkdir -p ${FASHN_WEIGHTS_DIR} \
    && HUGGING_FACE_HUB_TOKEN="${HF_TOKEN}" HF_TOKEN="${HF_TOKEN}" \
       python ${FASHN_REPO_DIR}/scripts/download_weights.py --weights-dir ${FASHN_WEIGHTS_DIR}

# The serverless handler.
COPY handler.py /app/handler.py
WORKDIR /app

CMD ["python", "-u", "handler.py"]

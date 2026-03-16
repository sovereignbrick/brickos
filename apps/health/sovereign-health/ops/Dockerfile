# syntax=docker/dockerfile:1
# ============================================================================
#  SOVEREIGN HEALTH INTELLIGENCE
#  BLOOD · BIOMARKERS · INSIGHT
#  https://sovereignhealth.io/ -- AGPL-3.0
# ============================================================================
# Infrastructure tooling image (Terraform, kubectl, etc.)

FROM alpine:3.19

RUN apk add --no-cache \
    bash \
    curl \
    git \
    jq \
    openssh-client

WORKDIR /ops
CMD ["bash"]

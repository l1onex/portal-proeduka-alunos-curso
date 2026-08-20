#!/usr/bin/env sh
# Build da imagem com os MESMOS --build-arg que o Dockerfile / GitHub Actions esperam.
# Uso (Linux/macOS/Git Bash):
#   cd repo && chmod +x deploy/build.sh && ./deploy/build.sh
# Opcional: TAG=ghcr.io/org/repo:main ./deploy/build.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/deploy/stack.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Crie ${ENV_FILE} a partir de deploy/stack.env.example" >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
. "$ENV_FILE"
set +a

TAG="${TAG:-proeduka:local}"

AL="${NEXT_PUBLIC_ALUNOS_TABLE:-${NEXT_PUBLIC_SUPABASE_ALUNOS_TABLE:-proeduka_alunos}}"

exec docker build -f "${ROOT}/Dockerfile" \
  --build-arg "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}" \
  --build-arg "NEXT_PUBLIC_ALUNOS_TABLE=${AL}" \
  -t "$TAG" \
  "$ROOT"

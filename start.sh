#!/usr/bin/env sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
JAR_FILE="$PROJECT_ROOT/target/meiye-live-1.0.0.jar"
BUILD=false
if [ "${1:-}" = "--build" ]; then
  BUILD=true
  shift
fi

if [ -n "${JAVA_HOME:-}" ]; then
  JAVA_COMMAND="$JAVA_HOME/bin/java"
else
  JAVA_COMMAND=$(command -v java || true)
fi
if [ -z "$JAVA_COMMAND" ] || [ ! -x "$JAVA_COMMAND" ]; then
  echo 'Install JDK 21 or newer and set JAVA_HOME or add java to PATH.' >&2
  exit 1
fi
JAVA_VERSION=$("$JAVA_COMMAND" --version 2>&1 | head -n 1)
JAVA_MAJOR=$(printf '%s\n' "$JAVA_VERSION" | sed -n 's/^[^ ]* \([0-9][0-9]*\).*/\1/p')
if [ -z "$JAVA_MAJOR" ] || [ "$JAVA_MAJOR" -lt 21 ]; then
  echo "JDK 21 or newer is required. Detected: $JAVA_VERSION" >&2
  exit 1
fi

cd "$PROJECT_ROOT"
if [ "$BUILD" = true ] || [ ! -f "$JAR_FILE" ]; then
  if ! command -v mvn >/dev/null 2>&1; then
    echo 'Install Maven 3.9 or newer and add mvn to PATH, then run: mvn clean package' >&2
    exit 1
  fi
  mvn -B -ntp clean package
fi
exec "$JAVA_COMMAND" -jar "$JAR_FILE" "$@"

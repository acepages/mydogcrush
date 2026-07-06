#!/bin/bash
DIR=$(cd "$(dirname "$0")" && pwd)
if [ -z "$JAVA_HOME" ]; then
  JAVA_EXE=java
else
  JAVA_EXE="$JAVA_HOME/bin/java"
fi
"$JAVA_EXE" -Xmx64m -classpath "$DIR/gradle/wrapper/gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain "$@"

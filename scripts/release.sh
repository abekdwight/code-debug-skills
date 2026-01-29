#!/bin/bash
set -e

TYPE=${1:-patch}
PACKAGE_DIR="packages/debugsk"
VERSION=$(node -p "require('./$PACKAGE_DIR/package.json').version")

# Parse version
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

case $TYPE in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "Bumping version: $VERSION -> $NEW_VERSION"

# Update package.json
node -e "
const pkg = require('./$PACKAGE_DIR/package.json');
pkg.version = '$NEW_VERSION';
require('fs').writeFileSync('./$PACKAGE_DIR/package.json', JSON.stringify(pkg, null, 2));
"

# Build
echo "Building..."
pnpm --filter debugsk build

# Publish
echo "Publishing..."
cd $PACKAGE_DIR
pnpm publish

echo "Released v$NEW_VERSION"

#!/bin/bash

# Setup script for the 'a' alias

ZSHRC="$HOME/.zshrc"
ALIAS_FILE="$(pwd)/.zsh_aliases"

# Check if .zshrc exists
if [ ! -f "$ZSHRC" ]; then
    echo "Creating .zshrc file..."
    touch "$ZSHRC"
fi

# Check if the alias file is already sourced
if grep -q "source.*\.zsh_aliases" "$ZSHRC" 2>/dev/null || grep -q "\. .*\.zsh_aliases" "$ZSHRC" 2>/dev/null; then
    echo "Alias file already sourced in .zshrc"
else
    echo "" >> "$ZSHRC"
    echo "# Source custom aliases" >> "$ZSHRC"
    echo "[ -f \"$ALIAS_FILE\" ] && source \"$ALIAS_FILE\"" >> "$ZSHRC"
    echo "Added alias source to .zshrc"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To activate the 'a' command, run one of these:"
echo "  1. source ~/.zshrc"
echo "  2. Open a new terminal"
echo ""
echo "Then navigate to your ixi-flower-tui directory and type 'a' to run your Go app!"

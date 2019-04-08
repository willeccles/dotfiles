source .path

# Path to your oh-my-zsh installation.
export ZSH="/Users/willeccles/.oh-my-zsh"

ZSH_AUTOSUGGEST_STRATEGY=match_prev_cmd
ZSH_AUTOSUGGEST_BUFFER_MAX_SIZE=20
ZSH_AUTOSUGGEST_USE_ASYNC=yes # can be set to anything

plugins=(osx git colored-man-pages zsh-autosuggestions zsh-syntax-highlighting)

ZSH_THEME=willeccles

source $ZSH/oh-my-zsh.sh

# wasn't working, at least on mac os
# it was still showing /bin/bash, so this fixes that
export SHELL=$(which zsh)

alias please='sudo $(history -p !-1)'
alias win32gpp='/usr/local/gcc-4.8.0-qt-4.8.4-for-mingw32/win32-gcc/bin/i586-mingw32-g++'
alias italics=$(tput sitm)
alias noitalics=$(tput ritm)

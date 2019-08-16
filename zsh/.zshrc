source ~/.path

# Path to your oh-my-zsh installation.
export ZSH="$HOME/.oh-my-zsh"

ZSH_AUTOSUGGEST_STRATEGY=match_prev_cmd
ZSH_AUTOSUGGEST_BUFFER_MAX_SIZE=20
ZSH_AUTOSUGGEST_USE_ASYNC=yes # can be set to anything

plugins=(osx git colored-man-pages zsh-autosuggestions zsh-syntax-highlighting)

ZSH_THEME=willeccles

# setup for my theme
if [[ -a "$(which git)" ]]; then
    export HAS_GIT="yes"
fi
if [[ -a "$(which svn)" ]]; then
    export HAS_SVN="yes"
fi

source $ZSH/oh-my-zsh.sh

# wasn't working, at least on mac os
# it was still showing /bin/bash, so this fixes that
export SHELL=$(which zsh)

alias please='sudo $(history -p !-1)'

if [[ -a "$(which ls-icons)" ]]; then
    alias ls=$(which ls-icons)
fi

# aliases vim
alias e=vim -p
alias eb=vim -b
alias E=vim -p
alias v=vim -p
alias vb=vim -b
alias V=vim -p
if [[ -a "$(which mvim)" ]]; then
    alias me=mvim -p
fi

# alias for git
alias g=git
alias gc="git commit -am"
alias ga=git add
alias gd=git diff

# scripts from my dotfiles ['stow scripts']
if [[ -a "$(which vcsstatus)" ]]; then
    alias s=$(which vcsstatus)
elif [[ -a "${HAS_GIT}" ]]; then
    alias s=git status
fi
if [[ -a "${HAS_SVN}" ]]; then
    if [[ -a "$(which svnsettle)" ]]; then
        alias s=$(which vcsstatus)
    fi
fi

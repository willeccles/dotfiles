export GOPATH=~/go
export PATH="$HOME/.cargo/bin:$PATH"

export PATH=/usr/local/bin:/usr/local/sbin:~:$PATH
export PATH="/Library/Frameworks/Python.framework/Versions/3.5/bin:${PATH}"
export PATH="/Library/Frameworks/Python.framework/Versions/3.7/bin:${PATH}"
export PATH="${GOPATH}/bin:${PATH}"
export PATH="/opt/local/bin:${PATH}"
export PATH="/opt/local/sbin:${PATH}"

export PATH="/usr/local/opt/gettext/bin:$PATH"
export PATH="/usr/local/opt/bison/bin:$PATH"

export PATH="$PATH:/opt/local/libexec/gnubin"
export PATH="$PATH:$HOME/.local/bin"
export PATH="$PATH:$HOME/bin"

export CLICOLOR=1

hascommand() {
    command -v "$1" &>/dev/null
}

if hascommand nvim; then
    export EDITOR="nvim"
else
    export EDITOR="vim"
fi

if hascommand open; then
    export OPENER="open"
fi

if [ "$(uname -s)" = "Darwin" ]; then
    alias nproc="sysctl -n hw.ncpu"
fi

alias please='sudo $(history -p !-1)'

# aliases vim
if hascommand nvim; then
    alias vim="nvim"
    alias vimdiff="nvim -d"
    alias ex="nvim -e"
    alias view="nvim -R"
fi
alias e="vim -p"
alias eb="vim -b"
alias E="vim -p"
alias v="vim -p"
alias vb="vim -b"
alias V="vim -p"
if hascommand mvim; then
    alias me="mvim -p"
fi

#if hascommand nvim; then
#    export MANPAGER='nvim +Man! +"set nocul" +"set noshowcmd" +"set noruler" +"set noshowmode" +"set laststatus=2" +"set statusline=%#CP_MANBAR#\ %t%=%p%%\ L%l:C%c\ "'
#fi

# alias for git
alias g="git"
alias gc="git commit -am"
alias ga="git add"
alias gd="git diff"
alias s="git status"

# if pfetch is installed, these will configure it
export PF_INFO="ascii title os kernel shell editor palette"
export PF_COL1=3

# if we have clang installed
export CC=gcc
export CXX=g++
export LD=ld
if hascommand mold; then
  export LD=mold
fi

export MAKEFLAGS=-j`nproc`

if hascommand kiss; then
    # kiss config
    export KISS_PATH=/var/db/kiss/repo/core:/var/db/kiss/repo/extra:/var/db/kiss/repo/xorg:/var/db/kiss/community-repo/community
    export KISS_RM
    export KISS_FORCE=0
    export KISS_ROOT=/
    export KISS_DEBUG=0
fi

if hascommand cpm; then
    alias ci="cpm install"
    alias cl="cpm list"
    alias cr="cpm remove"
    alias cI="cpm show"
    alias cs="cpm search"
fi

if [ -f ~/.config/uncrustify.cfg ]; then
    export UNCRUSTIFY_CONFIG="$HOME/.config/uncrustify.cfg"
fi

# set the code which is used for control z on macos vs linux
if [ "$(uname)" = "Darwin" ]; then
    export CONTROL_Z_CODE=146
else
    export CONTROL_Z_CODE=148
fi

export PROMPT_CHAR="➜"
if [ "$TERM" = "st-256color" ] || [ "$TERM" = "linux" ]; then
    export PROMPT_CHAR=">"
fi

if hascommand xclip; then
    alias clipboard="xclip -selection clipboard"
fi

if [ "$TERM" = "linux" ]; then
    # gruvbox in TTY ;)
    echo -en "\e]P0282828"
    echo -en "\e]P8928374"
    echo -en "\e]P1CC241D"
    echo -en "\e]P9FB4934"
    echo -en "\e]P298971A"
    echo -en "\e]PAB8BB26"
    echo -en "\e]P3D79921"
    echo -en "\e]PBFABD2F"
    echo -en "\e]P4458588"
    echo -en "\e]PC83A598"
    echo -en "\e]P5B16286"
    echo -en "\e]PDD3869B"
    echo -en "\e]P6689D6A"
    echo -en "\e]PE8EC07C"
    echo -en "\e]P7A89984"
    echo -en "\e]PFEBDBB2"
    clear # fix some weird artifacting
fi

if hascommand gpg-agent && [ ! "$(uname)" = "Darwin" ]; then
  eval $(gpg-agent --daemon --default-cache-ttl 432000 \
    --max-cache-ttl 432000 2>/dev/null)
fi

export GPG_TTY="$(tty)"
if hascommand gpgconf; then
  export GPG_AGENT_INFO="$(gpgconf --list-dirs agent-socket | \
    tr -d '\n' && echo -n ::)"
fi

if [ -f ~/.localprofile ]; then
    . ~/.localprofile
fi

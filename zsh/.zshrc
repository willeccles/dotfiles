source $HOME/.zprofile

autoload -Uz compinit && compinit

export ZSH="$HOME/.zsh"

ZSH_AUTOSUGGEST_STRATEGY=match_prev_cmd
ZSH_AUTOSUGGEST_BUFFER_MAX_SIZE=20
ZSH_AUTOSUGGEST_USE_ASYNC=yes # can be set to anything
ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=8'
ZSH_HIGHLIGHT_HIGHLIGHTERS=(main brackets)

# load plugins
source "$ZSH/plugins/colored-man-pages.zsh"
source "$ZSH/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh"
source "$ZSH/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"

# source all the other configs stolen from oh-my-zsh
for config_file ($ZSH/lib/*.zsh); do
  source $config_file
done

# Search command history with fzf when I press C-r instead of the awful builtin
# search function.
function _fzf_history() {
  emulate -LR zsh
  LBUFFER="$(fc -lnr 0 | awk '{sub(/ *$/, "", $0);} !_[$0]++' | \
    fzf --reverse --height='20%' --min-height=10 --no-sort --border=rounded \
    --prompt="reverse history search: " --tiebreak=index)" || true
  zle redisplay
}
if command -v fzf >/dev/null; then
  zle -N _fzf_history
  bindkey '^r' _fzf_history
fi

if command -v promptus >/dev/null; then
  precmd() { PROMPT="$(eval 'promptus $?')" }
fi

# this won't get used if promptus is found above
export PROMPT="%F{yellow}%(?..%(130?.^C.%(${CONTROL_Z_CODE}?.^Z.%(148?.^Z.%B%F{red}%?))) )%B%F{magenta}%1~ %b%(!.%F{red}.%F{green})${PROMPT_CHAR}%f "

export RPROMPT='%F{yellow}%(1j.%j.)%f'
export PROMPT2="%F{yellow}${PROMPT_CHAR}%f "

printf "\033[90mWelcome to %s, %s.\nIt's currently %s.\n\033[92m---,--'-{\033[91m@\033[m\n" "$(hostname)" "$USER" "$(date +'%A, %B %-d, %Y')"

if [ -e /Users/cactus/.nix-profile/etc/profile.d/nix.sh ]; then . /Users/cactus/.nix-profile/etc/profile.d/nix.sh; fi # added by Nix installer

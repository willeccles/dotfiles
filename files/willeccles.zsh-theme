function pwd_exit {
	local EXIT="$?"
	
	if [ $EXIT -ne 0 ]; then
		# 146 is STOPPED, like control-z, etc.
		if [ $EXIT -eq 146 ]; then
			# when its 146 i want it to show me what job i stopped
			# just the command name though, no args
			# this regex is actually cancerous to look at, i know
			# i'm so sorry, future me
			local lastjob=$(jobs -p | tail -n 1 | perl -pe 's/^\S+\s+\+\s+\S+\s+\S+\s+//')
			echo "%{$fg[yellow]%}${lastjob} %{$reset_color%}"
		elif [ $EXIT -eq 130 ]; then
			echo "%{$fg[yellow]%}^C %{$reset_color%}"
		else
			echo "%{$fg_bold[red]%}${EXIT} %{$reset_color%}"
		fi
	fi
}

function pwd_jobcount {
	local jobnum=$(jobs -p | wc -l | tr -d ' ')
	
	if [ $jobnum -ne 0 ]; then
		echo "%{$fg[yellow]%}${jobnum}%{$reset_color%}"
	fi
}

# override this, since i'm not happy with the default options
function git_prompt_info {

}

#ZSH_THEME_GIT_PROMPT_PREFIX="%{$fg[cyan]%} "
#ZSH_THEME_GIT_PROMPT_SUFFIX=" %{$reset_color%}"
#ZSH_THEME_GIT_PROMPT_DIRTY="M"
#ZSH_THEME_GIT_PROMPT_UNTRACKED="?"
#ZSH_THEME_GIT_PROMPT_CLEAN=""

PROMPT='$(pwd_exit)%{$fg_bold[magenta]%}%1~%{$reset_color%} $(git_prompt_info)$(pwd_jobcount)%{$fg_bold[green]%}%{$reset_color%} '

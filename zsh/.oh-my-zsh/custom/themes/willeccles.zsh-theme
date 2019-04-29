function prompt_exit {
	local EXIT="$?"
	
	if [ $EXIT -ne 0 ]; then
		# 146 is STOPPED, like control-z, etc.
		if [ $EXIT -eq 146 ]; then
			# when its 146 i want it to show me what job i stopped
			# just the command name though, no args
			# this regex is actually cancerous to look at, i know
			# i'm so sorry, future me
			local lastjob=$(jobs -p | tail -n 1 | perl -pe 's/^\S+\s+\+\s+\S+\s+\S+\s+//' | perl -pe 's/\s.+//')
			echo "%{$fg[yellow]%}${lastjob} %{$reset_color%}"
		elif [ $EXIT -eq 130 ]; then
			echo "%{$fg[yellow]%}^C %{$reset_color%}"
		else
			echo "%{$fg_bold[red]%}${EXIT} %{$reset_color%}"
		fi
	fi
}

function prompt_jobcount {
	local jobnum=$(jobs -p | wc -l | tr -d ' ')
	
	if [ $jobnum -ne 0 ]; then
		echo "%{$fg[yellow]%} ${jobnum}%{$reset_color%}"
	fi
}

# git things {{{
# get current status of git repo
function parse_git_dirty() {
	gstatus=`git status 2>&1 | tee`
	dirty=`echo -n "${gstatus}" 2> /dev/null | grep "modified:" &> /dev/null; echo "$?"`
	untracked=`echo -n "${gstatus}" 2> /dev/null | grep "Untracked files" &> /dev/null; echo "$?"`
	ahead=`echo -n "${gstatus}" 2> /dev/null | grep "Your branch is ahead of" &> /dev/null; echo "$?"`
	newfile=`echo -n "${gstatus}" 2> /dev/null | grep "new file:" &> /dev/null; echo "$?"`
	renamed=`echo -n "${gstatus}" 2> /dev/null | grep "renamed:" &> /dev/null; echo "$?"`
	deleted=`echo -n "${gstatus}" 2> /dev/null | grep "deleted:" &> /dev/null; echo "$?"`
	bits=''
	if [ "${renamed}" = "0" ]; then
		bits=">${bits}"
	fi
	if [ "${ahead}" = "0" ]; then
		bits="*${bits}"
	fi
	if [ "${newfile}" = "0" ]; then
		bits="+${bits}"
	fi
	if [ "${untracked}" = "0" ]; then
		bits="?${bits}"
	fi
	if [ "${deleted}" = "0" ]; then
		bits="x${bits}"
	fi
	if [ "${dirty}" = "0" ]; then
		bits="M${bits}"
	fi
	if [ "${bits}" != "" ]; then
		echo " ${bits}"
	else
		echo ""
	fi
}

# get current branch in git repo
function prompt_parse_git_branch() {
	BRANCH=`git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/\1/'`
	if [ "${BRANCH}" != "" ]
	then
		STAT=$(parse_git_dirty)
		echo "%{$fg[cyan]%} ${BRANCH}${STAT} %{$reset_color%}"
	else
		echo ""
	fi
}
# }}}

# override this, since i'm not happy with the default options
function git_prompt_info {
	echo $(prompt_parse_git_branch)
}

# these are here for posterity
#ZSH_THEME_GIT_PROMPT_PREFIX="%{$fg[cyan]%} "
#ZSH_THEME_GIT_PROMPT_SUFFIX=" %{$reset_color%}"
#ZSH_THEME_GIT_PROMPT_DIRTY="M"
#ZSH_THEME_GIT_PROMPT_UNTRACKED="?"
#ZSH_THEME_GIT_PROMPT_CLEAN=""

PROMPT='$(prompt_exit)%{$fg_bold[magenta]%}%1~%{$reset_color%} $(git_prompt_info)%{$fg_bold[green]%}%{$reset_color%} '

RPROMPT='$(prompt_jobcount)'

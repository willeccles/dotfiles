function prompt_exit {
	local EXIT="$?"
	
	if [ $EXIT -ne 0 ]; then
		# 148 is STOPPED, like control-z, etc.
        # it seems to be 146 on macos
		if [ $EXIT -eq 148 ] || [ $EXIT -eq 146 ]; then
            # the + indicates the last job
            local lastjob=$(jobs | grep "+" | perl -pe "s/[\s\t]+/ /g" | cut -d" " -f4)
			echo "%{$fg[yellow]%}${lastjob} %{$reset_color%}"
		elif [ $EXIT -eq 130 ]; then
			echo "%{$fg[yellow]%}^C %{$reset_color%}"
		else
			echo "%{$fg_bold[red]%}${EXIT} %{$reset_color%}"
		fi
	fi
}

function prompt_jobcount {
	local jobnum=$(jobs | grep "\[" | wc -l | tr -d ' ')
	
	if [ $jobnum -ne 0 ]; then
		echo "%{$fg[yellow]%} ${jobnum}%{$reset_color%}"
	fi
}

# git things {{{
# get current status of git repo
function parse_git_dirty() {
    if [ "${HAS_GIT}" = "" ]; then
        echo ""
        return
    fi
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

# svn things {{{
function parse_svn_dirty() {
    svnstatus=`svn status 2> /dev/null`
    dirty=`echo -n "${svnstatus}" 2> /dev/null | grep ^M &> /dev/null; echo "$?"`
    newfile=`echo -n "${svnstatus}" 2> /dev/null | grep ^A &> /dev/null; echo "$?"`
    untracked=`echo -n "${svnstatus}" 2> /dev/null | grep "^?" &> /dev/null; echo "$?"`
    deleted=`echo -n "${svnstatus}" 2> /dev/null | grep ^D &> /dev/null; echo "$?"`
    missing=`echo -n "${svnstatus}" 2> /dev/null | grep "^!" &> /dev/null; echo "$?"`
    bits=''
    if [ "${newfile}" = "0" ]; then
        bits="+${bits}"
    fi
    if [ "${missing}" = "0" ]; then
        bits="!${bits}"
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

function prompt_parse_svn_repo() {
    # check to see that SVN is installed
    if [ "${HAS_SVN}" = "" ]; then
        echo ""
        return
    fi

    svnrepo=`svn info 2> /dev/null | grep ^URL`
    svnstatus=`svn status 2> /dev/null`
    svnignored=`echo -n ${svnstatus} 2> /dev/null | grep "^I \+." &> /dev/null; echo "$?"`
    svnuntracked=`echo -n ${svnstatus} 2> /dev/null | grep "^? \+." &> /dev/null; echo "$?"`
    if [ "${svnrepo}" != "" ]; then
        STAT=$(parse_svn_dirty)
		echo "%{$fg[cyan]%} ${svnrepo##*/}${STAT} %{$reset_color%}"
    else
        if [ "${svnuntracked}" = "0" ]; then
            echo "%{$fg[cyan]%} ${PWD##*/}:? %{$reset_color%}"
        elif [ "${svnignored}" = "0" ]; then
            echo "%{$fg[cyan]%} ${PWD##*/}:I %{$reset_color%}"
        else
            echo ""
        fi
    fi
}
#}}}

# override this, since i'm not happy with the default options
function git_prompt_info {
	echo $(prompt_parse_git_branch)
}

function vcs_prompt_info {
    STAT=$(prompt_parse_git_branch)
    if [ "${STAT}" = "" ]; then
        STAT=$(prompt_parse_svn_repo)
    fi
    echo "${STAT}"
}

# these are here for posterity
#ZSH_THEME_GIT_PROMPT_PREFIX="%{$fg[cyan]%} "
#ZSH_THEME_GIT_PROMPT_SUFFIX=" %{$reset_color%}"
#ZSH_THEME_GIT_PROMPT_DIRTY="M"
#ZSH_THEME_GIT_PROMPT_UNTRACKED="?"
#ZSH_THEME_GIT_PROMPT_CLEAN=""

PROMPT='$(prompt_exit)%{$fg_bold[magenta]%}%1~%{$reset_color%} $(vcs_prompt_info)%{$fg_bold[green]%}%{$reset_color%} '

RPROMPT='$(prompt_jobcount)'

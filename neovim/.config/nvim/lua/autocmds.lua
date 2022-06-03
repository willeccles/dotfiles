local cmd = vim.cmd
local fn = vim.fn

function exec(str)
  return vim.api.nvim_exec(str, true)
end

exec[[
augroup vimrc
  au!
  autocmd BufNewFile,BufRead Makefile,*.mk,*.sh,*.zsh-theme,*.vimrc,*.vim,*rc,*.conf  setl foldlevel=0 foldmethod=marker
augroup END

" disable bells
autocmd GUIEnter * set vb t_vb=

augroup zsh_theme_ft
  au!
  autocmd BufNewFile,BufRead *.zsh-theme  setlocal filetype=zsh
augroup END

augroup arduino_ino
  au!
  autocmd BufNewFile,BufRead *.ino  setlocal filetype=cpp
augroup END

augroup vifm_ft
  au!
  autocmd BufNewFile,BufRead *.vifm,vifm*  setlocal ft=vim
augroup END

autocmd BufNewFile,BufRead *.c,*.h,*.cpp,*.hpp,*.cc let b:man_default_sects='2,3'

autocmd BufNewFile,BufRead *.dot,*.dts,*.dtsi,*.make,*.cmake,*.mk setl tw=0

autocmd BufNewFile,BufRead Kbuild setlocal ft=make

autocmd FileType man setl nospell
]]

if fn.executable('xxd') then
  exec[[
  augroup Binary
    au!
    au BufReadPost * if &bin | %!xxd
    au BufReadPost * set ft=xxd nospell | endif
    au BufWritePre * if &bin | %!xxd -r
    au BufWritePre * endif
    au BufWritePost * if &bin | %!xxd
    au BufWritePost * set nomod | endif
  augroup END
  ]]
end

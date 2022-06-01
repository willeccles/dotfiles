local cmd = vim.cmd
local fn = vim.fn
local o = vim.o
local w = vim.wo
local b = vim.bo

function set(key, value)
  vim.opt[key] = value
end

set('showmode', false)
vim.g.t_Co = "256"

set('laststatus', 2)
set('modeline', true)
set('ruler', false)

set('so', 3)
set('siso', 3)

set('wrap', false)

set('tw', 80)
set('colorcolumn', "81")

set('fo', "tjcrqln1")

set('lazyredraw', true)

set('nrformats', "alpha,bin,hex,octal")

set('hidden', true)
set('switchbuf', "useopen")

set('splitright', true)
set('splitbelow', true)

set('title', true)
set('titlestring', "%t - NVIM")

set('undodir', "/tmp/nvim-undodir")
set('undofile', true)

set('mouse', "a")

set('backspace', "indent,eol,start")

set('hlsearch', true)

set('updatetime', 500)

if fn.executable("ag") then
  set('grepprg', "ag --vimgrep $*")
  set('grepformat', "%f:%l:%c:%m")
end

set('rnu', false)
set('nu', false)

set('cursorline', true)

cmd 'filetype plugin indent on'
cmd 'syntax enable'

set('background', "dark")
set('termguicolors', true)

set('tabstop', 2)
set('softtabstop', 2)
set('shiftwidth', 2)
set('smarttab', true)
set('expandtab', true)

set('cino', "hs,l1,g0,t0,i4,+4,(0,w1,W4,E-s,N-s")

set('completeopt', 'menu,preview,menuone,noinsert,longest')
vim.opt.shortmess:append('c')

set('pb', 20)
set('winbl', 20)

set('inccommand', 'nosplit')

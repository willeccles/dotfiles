local cmd = vim.cmd
local fn = vim.fn
local o = vim.o
local w = vim.w
local b = vim.b

o.showmode = false
o.t_Co = "256"

o.laststatus = 2
o.modeline = true
o.ruler = false

o.so = 3
o.siso = 3

o.wrap = false

o.tw = 80
o.colorcolumn = "81"

o.fo = "tjcrqln1"

o.lazyredraw = true

o.nrformats = "alpha,bin,hex,octal"

o.hidden = true
o.switchbuf = "useopen"

o.splitright = true
o.splitbelow = true

o.title = true
o.titlestring = "%t - NVIM"

o.undodir = "/tmp/nvim-undodir"
o.undofile = true

o.mouse = "a"

o.backspace = "indent,eol,start"

o.hlsearch = true

o.updatetime = 500

if fn.executable("ag") then
  o.grepprg = "ag --vimgrep $*"
  o.grepformat = "%f:%l:%c:%m"
end

w.rnu = true
w.nu = true

w.cursorline = true

cmd 'filetype plugin indent on'
cmd 'syntax enable'

o.background = "dark"
o.termguicolors = true

o.tabstop = 2
o.softtabstop = 2
o.shiftwidth = 2
o.smarttab = true
o.expandtab = true

o.cino = "hs,l1,g0,t0,i4,+4,(0,w1,W4,E-s,N-s"

o.completeopt = o.completeopt .. ",preview"
o.completeopt = o.completeopt .. ",menuone"
o.completeopt = o.completeopt .. ",noinsert"
o.completeopt = o.completeopt .. ",longest"
o.shortmess = o.shortmess .. "c"

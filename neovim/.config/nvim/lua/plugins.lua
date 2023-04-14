local fn = vim.fn
local cmd = vim.cmd

local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable",
    lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

local plugins = {
  {
    "willeccles/gruvbox",
    lazy = false,
    priority = 1000,
    config = function()
      vim.g.gruvbox_italic = false
      vim.g.gruvbox_invert_selection = false
      vim.cmd('colorscheme gruvbox')

      --used by better-whitespace
      vim.cmd [[highlight ExtraWhitespace guibg=#fb4934]]

      --default status line colors which have to be specified because this is
      --compared with StatusLineNC when falling back to that
      vim.cmd [[highlight StatusLine guibg=#3c3836 guifg=#ebdbb2]]
      --non-focused status line colors to fall back to when User1..2 aren't used
      vim.cmd [[highlight StatusLineNC guibg=#32302f guifg=#bdae93]]

      --use these with %1* and %2*
      vim.cmd [[highlight User1 guibg=#3c3836 guifg=#928374]]
      vim.cmd [[highlight User2 guibg=#3c3836 guifg=#ebdbb2]]
    end,
  },

  --[[
  use {
    "folke/which-key.nvim",
    config = function()
      require("which-key").setup {
        plugins = {
          spelling = {
            enabled = true,
            suggestions = 20,
          },
        },
      }
    end
  }
  ]]

  {
    'stevearc/dressing.nvim',
    lazy = false,
    priority = 60,
    opts = {},
  },

  {
    'rcarriga/nvim-notify',
    lazy = false,
    priority = 60,
    opts = {},
    init = function()
      vim.notify = require'notify'
    end,
  },

  {
    "nvim-treesitter/nvim-treesitter",
    enabled = vim.fn.executable("tree-sitter"),
    build = ":TSUpdate",
    config = function()
      require('nvim-treesitter.configs').setup {
        ensure_installed = "all",
        ignore_install = { "json" },
        highlight = {
          enable = true,
          custom_captures = {
            ["punctuation.bracket"] = "",
            ["punctuation.delimiter"] = "",
            ["operator"] = "",
          },
          disable = { "c", "cpp", "bash", "cmake", "help", "make" },
        },
        indent = {
          enable = false,
        },
      }
    end,
  },

  {
    "lewis6991/spellsitter.nvim",
    cond = vim.fn.executable("tree-sitter"),
    opts = {
      enable = true,
    },
  },

  {
    "neovim/nvim-lspconfig",
    config = function()
      require'lspconfig'.clangd.setup{}
      require'lspconfig'.pyright.setup{}
    end,
  },

  {
    "lewis6991/gitsigns.nvim",
    dependencies = { "nvim-lua/plenary.nvim" },
    opts = {
      signs = {
        add          = { hl = 'GruvboxGreenSign', text = '+' },
        change       = { hl = 'GruvboxAquaSign', text = '~' },
        delete       = { hl = 'GruvboxRedSign', text = '_' },
        topdelete    = { hl = 'GruvboxRedSign', text = '‾' },
        changedelete = { hl = 'GruvboxAquaSign', text = '~' },
      },
      numhl = false,
      linehl = false,
    },
  },

  {
    "nvim-telescope/telescope.nvim",
    cmd = 'Telescope',
    dependencies = {
      'nvim-lua/popup.nvim',
      'nvim-lua/plenary.nvim',
    },
    opts = {
      defaults = {
        layout_strategy = 'flex',
        dynamic_preview_title = true,
      },
      pickers = {
        buffers = {
          theme = 'ivy',
        },
        man_pages = {
          theme = 'dropdown',
        },
        spell_suggest = {
          theme = 'cursor',
        },
        oldfiles = {
          theme = 'ivy',
        },
        git_files = {
          theme = 'ivy',
        },
        find_files = {
          theme = 'ivy',
        },
        fd = {
          theme = 'ivy',
        },
        grep_string = {
          theme = 'dropdown',
        },
        current_buffer_fuzzy_find = {
          theme = 'dropdown',
        },
        help_tags = {
          theme = 'dropdown',
        },
      },
    },
    keys = {
      {
        '<C-p>',
        function()
          require'telescope.builtin'.find_files({
            no_ignore = true,
            no_ignore_parent = true,
            hidden = true,
          })
        end,
        desc = '[telescope] find files in working directory',
      },
      { 'z=', require'telescope.builtin'.spell_suggest },
      {
        '<Leader>g',
        require'telescope.builtin'.grep_string,
        desc = '[telescope] grep string under cursor in current directory',
      },
      {
        '<Leader>/',
        require'telescope.builtin'.current_buffer_fuzzy_find,
        desc = '[telescope] current buffer fuzzy find',
      },
      {
        '<Leader>b',
        require'telescope.builtin'.buffers,
        desc = '[telescope] preview/search open buffers',
      },
      {
        '<Leader>o',
        function()
          require'telescope.builtin'.oldfiles({
            path_display = {'smart'},
          })
        end,
        desc = '[telescope] browse old files',
      },
    },
  },

  "adelarsq/vim-matchit",

  {
    "godlygeek/tabular",
    cmd = { 'Tab', 'Tabularize' },
  },

  {
    'LnL7/vim-nix',
    ft = 'nix',
  },

  {
    "ziglang/zig.vim",
    ft = 'zig',
    config = function()
      vim.g.zig_fmt_autosave = 0
    end,
  },

  {
    'kyazdani42/nvim-tree.lua',
    tag = 'nightly',
    keys = {
      { '<C-n>', '<Cmd>NvimTreeToggle<CR>' },
    },
    opts = {},
  },

  'junegunn/vim-slash',
  'justinmk/vim-sneak',
  'machakann/vim-highlightedyank',
  'tomtom/tcomment_vim', -- TODO: check out numToStr/Comment.nvim instead
  'tpope/vim-fugitive',
  'tpope/vim-surround',
  {
    'zhimsel/vim-stay',
    config = function()
      vim.opt.viewoptions = 'cursor,folds,slash,unix'
    end,
  },
  'sickill/vim-pasta',
  'ntpeters/vim-better-whitespace',

  {
    'mbbill/undotree',
    cmd = 'UndotreeToggle',
  },

  {
    'ggandor/leap.nvim',
    dependencies = {
      'tpope/vim-repeat',
    },
    config = function()
      require'leap'.add_default_mappings()
    end,
  },

  {
    'sindrets/winshift.nvim',
    cmd = 'WinShift',
    keys = {
      { '<C-W><C-M>', '<Cmd>WinShift<CR>' },
      { '<C-W>m', '<Cmd>WinShift<CR>' },
      { '<C-W>x', '<Cmd>WinShift swap<CR>' },
    },
  },

  {
    'folke/zen-mode.nvim',
    cmd = 'ZenMode',
    opts = {
      window = {
        backdrop = 0.8,
        width = 82,
        options = {
          signcolumn = "no",
          number = false,
          relativenumber = false,
          foldcolumn = "0",
          colorcolumn = "",
        },
      },
    },
  },

  {
    'folke/twilight.nvim',
    cmd = { 'Twilight', 'TwilightEnable', 'TwilightDisable' },
    opts = {},
  },

  {
    'uga-rosa/ccc.nvim',
    cmd = 'CccPick',
    opts = {},
  },
}

require("lazy").setup(plugins)

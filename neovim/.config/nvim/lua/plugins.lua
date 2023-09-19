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

-- TODO fork venn, add config to change box characters
-- TODO maybe add hydra for neogit and venn?

local plugins = {
  {
    "ellisonleao/gruvbox.nvim",
    commit = '353be59',
    lazy = false,
    priority = 1000,
    config = function()
      require'gruvbox_config'.configure(vim.o.background)
    end,
  },

  {
    "folke/which-key.nvim",
    event = 'VeryLazy',
    opts = {
      plugins = {
        spelling = {
          enabled = false,
        },
      },
    },
  },

  {
    'stevearc/dressing.nvim',
    event = 'VeryLazy',
    priority = 60,
    opts = {},
  },

  {
    'rcarriga/nvim-notify',
    lazy = false,
    priority = 60,
    opts = {
      top_down = false,
    },
    init = function()
      vim.notify = require'notify'
    end,
  },

  {
    "nvim-treesitter/nvim-treesitter",
    enabled = vim.fn.executable("tree-sitter"),
    build = ":TSUpdate",
    event = 'VeryLazy',
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
    "neovim/nvim-lspconfig",
    event = 'VeryLazy',
    ft = { 'c', 'cpp', 'objc', 'objcpp', 'cuda', 'proto', 'python', 'rust' },
    config = function()
      require'lspconfig'.clangd.setup{}
      require'lspconfig'.pyright.setup{}
      -- require'lspconfig'.rust_analyzer.setup{}
    end,
    keys = {
      {
        '<Leader>r',
        vim.lsp.buf.rename,
        desc = '[lsp] rename symbol under cursor',
      },
      {
        '<Leader>v',
        vim.lsp.buf.hover,
        desc = '[lsp] hover popup for symbol under cursor',
      },
    },
  },

  {
    "ms-jpq/coq_nvim",
    cond = vim.fn.executable('python3') and vim.fn.executable('sqlite'),
    cmd = { 'COQnow', 'COQhelp', 'COQdeps' },
    config = function()
      vim.g.coq_settings = {
        -- ['auto_start'] = 'shut-up',
        ['display.icons.mode'] = 'none',
        ['completion.always'] = false,
        ['clients.snippets.warn'] = {},
      }
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
      { 'z=', function() require'telescope.builtin'.spell_suggest() end },
      {
        '<Leader>g',
        function() require'telescope.builtin'.grep_string() end,
        desc = '[telescope] grep string under cursor in current directory',
      },
      {
        '<Leader>/',
        function() require'telescope.builtin'.current_buffer_fuzzy_find() end,
        desc = '[telescope] current buffer fuzzy find',
      },
      {
        '<Leader>b',
        function() require'telescope.builtin'.buffers() end,
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

  {
    "adelarsq/vim-matchit",
    event = 'VeryLazy',
  },

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

  {
    'junegunn/vim-slash',
    event = 'VeryLazy',
  },

  {
    'numToStr/Comment.nvim',
    event = 'VeryLazy',
    opts = {},
  },

  {
    'TimUntersberger/neogit',
    cmd = { 'Neogit' },
    dependencies = {
      'nvim-lua/plenary.nvim',
    },
    opts = {
      disable_signs = true,  -- use gitsigns.nvim for this
    },
  },

  {
    'kylechui/nvim-surround',
    event = 'VeryLazy',
    opts = {},
  },

  {
    'zhimsel/vim-stay',
    config = function()
      vim.opt.viewoptions = 'cursor,folds,slash,unix'
    end,
  },

  {
    'sickill/vim-pasta',
    event = 'VeryLazy',
  },

  {
    'echasnovski/mini.trailspace',
    main = 'mini.trailspace',
    event = 'VeryLazy',
    opts = {},
    keys = {
      {
        '<Leader>s',
        function()
          require'mini.trailspace'.trim()
          require'mini.trailspace'.trim_last_lines()
        end,
        desc = '[mini.trailspace] trim trailing whitespace and lines',
      },
    },
  },

  {
    'mbbill/undotree',
    cmd = 'UndotreeToggle',
  },

  {
    'ggandor/leap.nvim',
    event = 'VeryLazy',
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
      {
        '<C-W><C-M>',
        '<Cmd>WinShift<CR>',
        desc = '[WinShift] interactively move window',
      },
      {
        '<C-W>m',
        '<Cmd>WinShift<CR>',
        desc = '[WinShift] interactively move window',
      },
      {
        '<C-W>x',
        '<Cmd>WinShift swap<CR>',
        desc = '[WinShift] swap windows',
      },
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
          sidescrolloff = 0,
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

  {
    'ellisonleao/glow.nvim',
    cond = vim.fn.executable('glow'),
    config = true,
    cmd = 'Glow',
  },

  {
    'dhruvasagar/vim-table-mode',
    event = 'VeryLazy',
    config = function()
      -- make table formatting like ReST
      vim.g.table_mode_corner_corner = '+'
      vim.g.table_mode_header_fillchar = '='
    end,
  },

  {
    'pwntester/octo.nvim',
    cmd = 'Octo',
    dependencies = {
      'nvim-lua/plenary.nvim',
      'nvim-telescope/telescope.nvim',
    },
    opts = {
      left_bubble_delimiter = "",
      right_bubble_delimiter = "",
    }
  },

  {
    'tommcdo/vim-lion',
    event = 'VeryLazy'
  },
}

require("lazy").setup(plugins)

local fn = vim.fn
local cmd = vim.cmd
local command = vim.api.nvim_create_user_command
local err = vim.api.nvim_err_writeln

function SplitHelper(f)
  if fn.winwidth('%') >= (fn.winheight('%') * 2) then
    cmd('vsplit ' .. f)
  else
    cmd('split ' .. f)
  end
end

function SplitNatural(args)
  if #args["fargs"] == 0 then
    SplitHelper('')
  else
    for _, f in ipairs(args["fargs"]) do
      SplitHelper(f)
    end
  end
end

command('S', SplitNatural, {
  nargs='*',
  complete="file",
  desc="split but good",
})

function ClangFormatCmd(args)
  if vim.fn.executable('clang-format') == 0 then
    vim.notify("clang-format not found!", vim.log.levels.ERROR, {
      title='ClangFormat',
    })
    return
  end

  local cfargs = '--lines=' .. args['line1'] .. ':' .. args['line2']
      .. ' --assume-filename=' .. fn.shellescape(fn.expand('%:t'))

  if #args["args"] > 0 then
    cmd('silent %!clang-format ' .. cfargs
        .. ' --style=' .. fn.shellescape(args['args']) .. ' --')
  else
    if args['bang'] then
      cmd('silent %!clang-format ' .. cfargs .. ' --style=file --')
    else
      cmd('silent %!clang-format ' .. cfargs
          .. ' --style=file --fallback-style=Google --')
    end
  end

  fn.cursor(args['line1'], 1)
  if not args['smods']['silent'] then
    local count = args['line2'] - args['line1'] + 1
    if count > 1 then
      print("Formatted " .. count .. " lines")
    else
      print("Formatted " .. count .. " line")
    end
  end
end

command('ClangFormat', ClangFormatCmd, {
  desc='clang-format the current buffer',
  nargs='?',
  range='%',
  bang=true,
  complete=function()
    return {"LLVM","GNU","Google","Chromium","Microsoft","Mozilla","WebKit"}
  end
})

function LightModeCmd(args)
  if vim.o.background ~= "light" then
    require'gruvbox_config'.configure("light")
  end
end

command('LightMode', LightModeCmd, {
  desc = 'switch theme to light mode',
})

function DarkModeCmd(args)
  if vim.o.background ~= "dark" then
    require'gruvbox_config'.configure("dark")
  end
end

command('DarkMode', DarkModeCmd, {
  desc = 'switch theme to dark mode',
})

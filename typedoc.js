/*
--categorizeByGroup       Specifies whether categorization will be done at the group level.
 --categoryOrder           Specifies the order in which categories appear. * indicates the relative order for categories not in the list.
 --defaultCategory         Specifies the default category for reflections without a category.
 --disableOutputCheck      Should TypeDoc disable the testing and cleaning of the output directory?
 --disableSources          Disables setting the source of a reflection when documenting it.
 --emit                    If set, TypeDoc will emit the TypeScript compilation result
 --entryPoints             The entry points of your library, which files should be documented as available to consumers.
 --exclude                 Define paths to be excluded when expanding a directory that was specified as an entry point.
 --excludeExternals        Prevent externally resolved symbols from being documented.
 --excludeInternal         Prevent symbols that are marked with @internal from being documented.
 --excludeNotDocumented    Prevent symbols that are not explicitly documented from appearing in the results.
 --excludePrivate          Ignores private variables and methods
 --excludeProtected        Ignores protected variables and methods
 --excludeTags             Remove the listed tags from doc comments.
 --externalPattern         Define patterns for files that should be considered being external.
 --gaID                    Set the Google Analytics tracking ID and activate tracking code.
 --gaSite                  Set the site name for Google Analytics. Defaults to `auto`.
 --gitRemote               Use the specified remote for linking to GitHub source files.
 --gitRevision             Use specified revision instead of the last revision for linking to GitHub source files.
 --help                    Print this message.
 --hideGenerator           Do not print the TypeDoc link at the end of the page.
 --highlightTheme          Specifies the code highlighting theme.
 --includes DIRECTORY      Specifies the location to look for included documents (use [[include:FILENAME]] in comments).
 --includeVersion          Add the package version to the project name.
 --json FILE               Specifies the location and filename a JSON file describing the project is written to.
 --listInvalidSymbolLinks  Emits a list of broken symbol [[navigation]] links after documentation generation
 --logger                  Specify the logger that should be used, 'none' or 'console'
 --logLevel                Specify what level of logging should be used.
 --markedOptions           Specify the options passed to Marked, the Markdown parser used by TypeDoc
 --media DIRECTORY         Specifies the location with media files that should be copied to the output directory.
 --name                    Set the name of the project that will be used in the header of the template.
 --options FILE            Specify a json option file that should be loaded. If not specified TypeDoc will look for 'typedoc.json' in the current directory
 --out DIRECTORY           Specifies the location the documentation should be written to.
 --plugin                  Specify the npm plugins that should be loaded. Omit to load all installed plugins, set to 'none' to load no plugins.
 --preserveWatchOutput     If set, TypeDoc will not clear the screen between compilation runs.
 --pretty                  Specifies whether the output JSON should be formatted with tabs.
 --readme                  Path to the readme file that should be displayed on the index page. Pass `none` to disable the index page and start the documentation on the globals page.
 --showConfig              Print the resolved configuration and exit
 --theme                   Specify the path to the theme that should be used, or 'default' or 'minimal' to use built-in themes.
 --toc                     Define the contents of the top level table of contents as a comma-separated list of global symbols.
 --tsconfig FILE           Specify a TypeScript config file that should be loaded. If not specified TypeDoc will look for 'tsconfig.json' in the current directory.
 --version                 Print TypeDoc's version.
 --watch                   Watch files for changes and rebuild docs on change.

Supported highlighting languages:
abap                actionscript-3      ada                 apex                
applescript         asm                 asp-net-razor       awk                 
bash                bat                 c                   clojure             
cobol               coffee              cpp                 cpp.embedded.macro  
crystal             csharp              css                 d                   
dart                diff                dockerfile          elixir              
elm                 erlang              fsharp              git-commit          
git-rebase          gnuplot             go                  graphql             
groovy              hack                haml                handlebars          
haskell             hcl                 hlsl                html                
html-ruby-erb       ini                 java                javascript          
jinja               jinja-html          js                  json                
jsonc               jsonnet             jsx                 julia               
kotlin              latex               less                lisp                
logo                lua                 makefile            markdown            
matlab              mdx                 nix                 objective-c         
ocaml               pascal              perl                perl6               
php                 php-html            pls                 postcss             
powershell          prolog              pug                 puppet              
purescript          python              r                   razor               
ruby                rust                sas                 sass                
scala               scheme              scss                sh                  
shaderlab           shell               shellscript         smalltalk           
sql                 ssh-config          stylus              swift               
tcl                 text                toml                ts                  
tsx                 typescript          vb                  viml                
vue                 vue-html            wasm                xml                 
xsl                 yaml                文言                  

Supported highlighting themes:
dark-plus
github-dark
github-light
light-plus
material-theme-darker
material-theme-default
material-theme-lighter
material-theme-ocean
material-theme-palenight
min-dark
min-light
monokai
nord
slack-theme-dark-mode
slack-theme-ochin
solarized-dark
solarized-light      
*/

module.exports = {

    // Specifies the entry points to be documented by TypeDoc. TypeDoc will
    // examine the exports of these files and create documentation according
    // to the exports. Either files or directories may be specified. If a
    // directory is specified, all source files within the directory will be
    // included as an entry point, unless excluded by --exclude.
    entryPoints: [
        "./src/lib/"
    ],

    // Set the name of the project that will be used in the header of the
    // template.
    name: "BDT (Bulk Data Tester)",

    // Specifies the output mode the project is used to be compiled with:
    // 'file' or 'modules'
    // mode: "modules",

    // Specifies the location the documentation should be written to.
    out: "./docs/typedoc",

    // Define patterns for excluded files when specifying paths.
    // exclude: ["node_modules"],

    highlightTheme: "min-light",

    // Define patterns for files that should be considered being external.
    // externalPattern: "node_modules",

    // Prevent externally resolved TypeScript files from being documented.
    // excludeExternals: true,

    // // Turn on parsing of .d.ts declaration files.
    // includeDeclarations: true,

    // // Should TypeDoc generate documentation pages even after the compiler has
    // // returned errors?
    // ignoreCompilerErrors: true,

    // Ignores private variables and methods
    excludePrivate: false,

    // Ignores protected variables and methods
    excludeProtected: false,

    // Prevent symbols that are not exported from being documented.
    // excludeNotExported: false,

    // Specifies whether categorization will be done at the group level.
    categorizeByGroup: true,

    // Specifies the order in which categories appear. * indicates the relative
    // order for categories not in the list.
    categoryOrder: "*",

    disableSources: false,

    // --defaultCategory         Specifies the default category for reflections without a category.
    // defaultCategory: "lib",
    // --disableOutputCheck      Should TypeDoc disable the testing and cleaning of the output directory?
    // --entryPoint              Specifies the fully qualified name of the root symbol. Defaults to global namespace.
    // entryPoint: "BDT",
    // --gaID                    Set the Google Analytics tracking ID and activate tracking code.
    // --gaSite                  Set the site name for Google Analytics. Defaults to `auto`.
    // --gitRevision             Use specified revision instead of the last revision for linking to GitHub source files.
    // --hideGenerator           Do not print the TypeDoc link at the end of the page.
    // --includes DIRECTORY      Specifies the location to look for included documents (use [[include:FILENAME]] in comments).
    includes: "./docs",
    // --json                    Specifies the location and file name a json file describing the project is written to.
    // --listInvalidSymbolLinks  Emits a list of broken symbol [[navigation]] links after documentation generation
    // listInvalidSymbolLinks: true,
    // --logger                  Specify the logger that should be used, 'none' or 'console'
    // --media DIRECTORY         Specifies the location with media files that should be copied to the output directory.
    // --options                 Specify a js option file that should be loaded. If not specified TypeDoc will look for 'typedoc.js' in the current directory.
    // --plugin                  Specify the npm plugins that should be loaded. Omit to load all installed plugins, set to 'none' to load no plugins.
    // --readme                  Path to the readme file that should be displayed on the index page. Pass `none` to disable the index page and start the documentation on the globals page.
    readme: "../README.md",
    // --theme                   Specify the path to the theme that should be used or 'default' or 'minimal' to use built-in themes.
    theme: "docs/typedoc-theme"
    // --toc                     Specifies the top level table of contents.
    // --tsconfig                Specify a typescript config file that should be loaded. If not specified TypeDoc will look for 'tsconfig.json' in the current directory.
};
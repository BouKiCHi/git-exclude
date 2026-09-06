# Git Exclude

[English](README.md)

Git Excludeは、VS Codeからローカル限定のGit除外設定とインデックス状態を操作する拡張機能です。未追跡のローカルファイルを`git status`に表示しないようにしたり、追跡済みファイルの変更を一時的に隠したりできます。

## メニューを開く

- ファイルを開き、エディタ右上の`...`から**GitExclude**を選択します。
- Explorerでファイルまたはフォルダを右クリックし、**GitExclude**を選択します。
- ソース管理ビューの変更ファイルを右クリックし、**ファイル/フォルダをexcludeに追加**を選択します。
- Explorerで複数のファイルやフォルダを選択すると、Exclude、Skip、Assumeの操作をまとめて適用できます。
- コマンドパレット（`F1`）からGitExcludeのコマンドを実行します。

コマンドパレットから**GitExclude: 使い方**を実行すると、このガイドをVS Code内で開けます。

## 操作の使い分け

### excludeへ追加

未追跡のファイルまたはフォルダを`.git/info/exclude`へ追加します。リポジトリ内だけで有効な`.gitignore`に似ています。設定はコミットされず、ほかの利用者とは共有されません。

すでにGitが追跡しているファイルの変更を隠すことはできません。

Explorerからファイルやフォルダを追加した後、通知の**excludeファイルを開く**ボタンを押すと、対象のexcludeファイルを開けます。

### ファイルの変更をスキップ（`--skip-worktree`）

追跡済みファイルへ`git update-index --skip-worktree`を設定します。ブランチの切り替えやpullを行う前、またはGitにローカル変更を再認識させたい場合は、**ファイルのスキップを解除**を実行してください。

### ファイルを未変更として設定（`--assume-unchanged`）

追跡済みファイルへ`git update-index --assume-unchanged`を設定します。このフラグはGitのパフォーマンス上のヒントであり、一般的な除外機能ではありません。通常の追跡状態に戻すには、**ファイルの未変更設定を解除**を実行します。

`skip-worktree`と`assume-unchanged`は、ローカル変更の見落としにつながる場合があります。秘密情報の保護や`.gitignore`の代わりには使用しないでください。

## ファイル状態

**ファイル/フォルダの現在の状態を表示**を選ぶと、現在のファイルに対して`git ls-files -v`を実行します。この拡張機能で使用する主な状態記号は次のとおりです。

| 状態 | 意味 | 表示される操作 |
| --- | --- | --- |
| `H` | 通常の追跡済みファイル | SkipまたはAssumeの設定 |
| `S` | `skip-worktree`設定済み | Skipの解除 |
| `h` | `assume-unchanged`設定済み | Assumeの解除 |
| `s` | 両方とも設定済み | SkipとAssumeの解除 |

エディタのメニューは、この状態に応じて設定コマンドと解除コマンドを切り替えます。

## ターミナルから復旧する

ファイルがGitの変更一覧に表示されない場合は、次のコマンドで状態を確認・解除できます。

```sh
git ls-files -v -- path/to/file
git update-index --no-skip-worktree -- path/to/file
git update-index --no-assume-unchanged -- path/to/file
```

**スキップされたすべてのファイルを表示**を実行すると、現在のリポジトリで`skip-worktree`が設定されたファイルを一覧表示できます。

## 開発

リポジトリのルートで次のコマンドを実行します。

- `npm ci`: 依存関係をインストール
- `npm run compile`: TypeScriptを`out/`へコンパイル
- `npm run lint`: ESLintを実行
- `npm test`: 拡張機能のテストを実行

リリース履歴は[CHANGELOG.md](CHANGELOG.md)を参照してください。

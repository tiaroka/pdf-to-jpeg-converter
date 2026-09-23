# Cloud Run デプロイ手順

## 前提条件

- Google Cloud アカウントとプロジェクト
- gcloud CLI がインストール済み
- Docker がインストール済み（ローカルで動作確認する場合）

サービス名・リージョン・レジストリは `cloudbuild.yaml` の `substitutions` に集約しています。

| 項目 | 値 |
|---|---|
| サービス名 | `pdf-to-jpeg-react` |
| リージョン | `asia-northeast1` |
| Artifact Registry リポジトリ | `cloud-run-source-deploy` |
| カスタムドメイン | `pdf2jpeg.aroka.net` |

## 初回セットアップ

```bash
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# 必要な API を有効化
gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com

# Artifact Registry のリポジトリを作成（初回のみ）
gcloud artifacts repositories create cloud-run-source-deploy \
  --repository-format=docker \
  --location=asia-northeast1
```

## デプロイ（Cloud Build）

```bash
# コミットハッシュをイメージタグにしてビルド・push・デプロイ
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_TAG=$(git rev-parse --short HEAD) .
```

`--allow-unauthenticated` の自動適用が組織ポリシーで失敗した場合は、明示的に付与する:

```bash
gcloud run services add-iam-policy-binding pdf-to-jpeg-react \
  --region=asia-northeast1 \
  --member=allUsers \
  --role=roles/run.invoker
```

## ローカルでの動作確認（Docker）

本番と同じ nginx 設定（セキュリティヘッダー・CSP を含む）で確認できます。

```bash
docker build -t pdf-to-jpeg-react .
docker run --rm -p 8080:8080 pdf-to-jpeg-react
# http://localhost:8080/ を開く。ヘッダー確認: curl -I http://localhost:8080/
```

## デプロイ後の確認

```bash
# セキュリティヘッダーが付いているか
curl -sI https://pdf2jpeg.aroka.net/ | grep -i -E "content-security-policy|strict-transport|x-content-type|x-frame"

# robots.txt / sitemap.xml が本物のファイルとして返るか（SPA にフォールバックしていないか）
curl -s https://pdf2jpeg.aroka.net/robots.txt
```

## カスタムドメインの設定

```bash
gcloud beta run domain-mappings create \
  --service pdf-to-jpeg-react \
  --domain pdf2jpeg.aroka.net \
  --region asia-northeast1
```

DNS には `pdf2jpeg` の CNAME を `ghs.googlehosted.com` に向ける。別プロジェクトで同じドメインがマッピング済みの場合は、既存マッピングを削除してから `--force-override` 付きで再作成する。

## トラブルシューティング

1. **ビルドエラー**: `package-lock.json` が存在し、Dockerfile の Node バージョン（22）が Vite の要件を満たしていることを確認
2. **メモリ不足**: `cloudbuild.yaml` の `--memory` を `1Gi` に増やす
3. **404 が返る静的ファイル**: `public/` に置いたファイルは `dist/` 直下にコピーされる。nginx は拡張子付きの未知のパスを 404 にする設定（`nginx.conf`）

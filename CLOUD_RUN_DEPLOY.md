# Cloud Run デプロイ手順

## 前提条件
- Google Cloud アカウント
- gcloud CLI がインストール済み
- Docker がインストール済み（オプション）

## デプロイ手順

### 1. Google Cloud プロジェクトの設定

```bash
# プロジェクトIDを設定（your-project-idを実際のプロジェクトIDに置き換え）
export PROJECT_ID=your-project-id

# プロジェクトを設定
gcloud config set project $PROJECT_ID

# 必要なAPIを有効化
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### 2. Cloud Build を使用してデプロイ（推奨）

```bash
# Cloud Build を使用してビルドとデプロイを実行
gcloud run deploy pdf-to-jpeg-converter \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1
```

### 3. ローカルでビルドしてデプロイ（オプション）

```bash
# Artifact Registry にリポジトリを作成（初回のみ）
gcloud artifacts repositories create cloud-run-source-deploy \
  --repository-format=docker \
  --location=asia-northeast1

# Docker イメージをビルド
docker build -t asia-northeast1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/pdf-to-jpeg-converter:latest .

# Docker イメージをプッシュ
docker push asia-northeast1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/pdf-to-jpeg-converter:latest

# Cloud Run にデプロイ
gcloud run deploy pdf-to-jpeg-converter \
  --image asia-northeast1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/pdf-to-jpeg-converter:latest \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1
```

## デプロイ後の確認

デプロイが完了すると、サービスのURLが表示されます：
```
Service URL: https://pdf-to-jpeg-converter-xxxxxxxxxx-an.a.run.app
```

このURLにアクセスして、アプリケーションが正常に動作していることを確認してください。

## カスタムドメインの設定（オプション）

```bash
# ドメインマッピングを作成
gcloud run domain-mappings create \
  --service pdf-to-jpeg-converter \
  --domain your-domain.com \
  --region asia-northeast1
```

## 更新のデプロイ

コードを更新した後、以下のコマンドで再デプロイできます：

```bash
gcloud run deploy pdf-to-jpeg-converter \
  --source . \
  --region asia-northeast1
```

## トラブルシューティング

1. **ビルドエラー**: `package-lock.json` が存在することを確認
2. **メモリ不足**: メモリを 1GB に増やす: `--memory 1Gi`
3. **タイムアウト**: タイムアウトを延長: `--timeout 300`
# Deploying Cookie Gate to AWS EC2

This guide outlines the steps to deploy the Cookie Gate application (Admin Portal, Tenant Platform, Backend Servers, and Database) to a single AWS EC2 instance using Docker Compose. This is the simplest and most cost-effective way to get your stack running in the cloud.

## Prerequisites

1.  **AWS Account**: You need access to the AWS Console.
2.  **Domain Name (Optional)**: If you want to access the app via a custom domain (e.g., `admin.yourdomain.com`).

---

## Step 1: Launch an EC2 Instance

1.  **Login to AWS Console** and navigate to **EC2**.
2.  Click **Launch Instance**.
3.  **Name**: `CookieGate-Production`
4.  **AMI**: Choose **Ubuntu Server 24.04 LTS** (or 22.04 LTS).
5.  **Instance Type**: Choose **t3.medium** (recommended for Node.js + Postgres). `t3.small` might run out of RAM during builds/migrations.
6.  **Key Pair**: Create a new key pair (e.g., `cookie-gate-key`) and download the `.pem` file. **Keep this safe!**
7.  **Network Settings**:
    *   Create a security group.
    *   Allow SSH traffic from **My IP**.
    *   Allow HTTP (80) and HTTPS (443) from **Anywhere**.
    *   (Temporary) Allow Custom TCP on ports `8080`, `8081`, `3000`, `3001` from **Anywhere** if you want to test without a reverse proxy first.
8.  **Storage**: Update to at least **20 GB** gp3.
9.  Click **Launch Instance**.

---

## Step 2: Configure the Server

1.  **Connect to your instance**:
    Open your terminal and run:
    ```bash
    chmod 400 path/to/cookie-gate-key.pem
    ssh -i path/to/cookie-gate-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
    ```

2.  **Install Docker & Docker Compose**:
    Run the following commands on the server:

    ```bash
    # Update packages
    sudo apt-get update
    
    # Install Docker
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
      
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add ubuntu user to docker group (avoids using sudo for docker commands)
    sudo usermod -aG docker ubuntu
    ```

3.  **Log out and log back in** for the group change to take effect.

---

## Step 3: Deploy the Code

1.  **Clone your repository** (Recommended) or copy files manually.
    *   *If using Git*:
        ```bash
        git clone <YOUR_REPO_URL> cookie-gate
        cd cookie-gate
        ```
    *   *If copying locally (run from your local machine)*:
        ```bash
        scp -i path/to/key.pem -r . ubuntu@<EC2-IP>:~/cookie-gate
        ```

2.  **Setup Environment Variables**:
    ```bash
    cd ~/cookie-gate
    cp .env.example .env
    nano .env
    ```
    *   Update `DB_PASSWORD`, `JWT_SECRET`, etc., to strong, random values.
    *   **Crucial**: Set the API URLs for the frontend containers.
        *   `ADMIN_API_URL`: `http://<EC2-PUBLIC-IP>:3000` (or your domain)
        *   `TENANT_API_URL`: `http://<EC2-PUBLIC-IP>:3001` (or your domain)
        *   `LOADER_URL`: `http://<EC2-PUBLIC-IP>:3001/public/loader.js`

3.  **Start the Application**:
    ```bash
    docker compose -f docker-compose.prod.yml up -d --build
    ```

4.  **Verify**:
    *   Run `docker compose -f docker-compose.prod.yml ps` to see if all containers are healthy.
    *   Visit `http://<EC2-PUBLIC-IP>:8080` for Admin Portal.
    *   Visit `http://<EC2-PUBLIC-IP>:8081` for Tenant Platform.

---

## Step 4: Production Hygiene (Recommended)

Running directly on ports 8080/8081 is not ideal for production. Use a reverse proxy like **Caddy** or **Nginx** on the host to handle SSL and standard ports.

### Option: Using Caddy (Easiest for SSL)

1.  **Install Caddy**:
    ```bash
    sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
    sudo apt update
    sudo apt install caddy
    ```

2.  **Configure Caddyfile**:
    ```bash
    sudo nano /etc/caddy/Caddyfile
    ```

    Add your configuration (replace domains with your actual DNS records):
    ```caddyfile
    admin.yourdomain.com {
        reverse_proxy localhost:8080
    }

    app.yourdomain.com {
        reverse_proxy localhost:8081
    }

    api-admin.yourdomain.com {
        reverse_proxy localhost:3000
    }

    api.yourdomain.com {
        reverse_proxy localhost:3001
    }
    ```

3.  **Restart Caddy**:
    ```bash
    sudo systemctl restart caddy
    ```
    Caddy will automatically fetch and renew HTTPS certificates for you.

---

## Troubleshooting

-   **Database Connection Failed**: Ensure the `postgres` container is healthy and the `DB_HOST` in `.env` matches the container name (`postgres` or `complyark-db` depending on network context). In docker-compose, it should be `postgres`.
-   **Build Fails (OOM)**: If build fails with exit code 137, your EC2 instance ran out of RAM. Upgrade to `t3.medium` or add Swap memory.
-   **Ports not accessible**: Check EC2 Security Groups to ensure ports 8080, 8081, etc., are open to 0.0.0.0/0.

# Freedom World Server - Docker Setup

This guide explains how to set up the PostgreSQL database using Docker for the Freedom World MMO RPG server.

## 🐳 Docker Services

The Docker Compose configuration includes:

- **PostgreSQL 15**: Main database server
- **Redis 7**: Caching and session storage
- **pgAdmin 4**: Database management UI (optional)

## 🚀 Quick Start

### 1. Start the Database Services

```bash
# Start PostgreSQL and Redis
docker compose up -d

# Or start with pgAdmin (database management UI)
docker compose --profile tools up -d
```

### 2. Verify Services are Running

```bash
# Check service status
docker compose ps

# Check logs
docker compose logs postgres
docker compose logs redis
```

### 3. Initialize the Database Schema

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Seed the database
npm run prisma:db:seed
```

### 4. Start the NestJS Server

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

## 📊 Service Details

### PostgreSQL Database
- **Host**: localhost
- **Port**: 5432
- **Database**: freedom_world_db
- **User**: postgres
- **Password**: password
- **Connection URL**: `postgresql://postgres:password@localhost:5432/freedom_world_db`

### Redis Cache
- **Host**: localhost
- **Port**: 6379
- **Password**: (none)

### pgAdmin (Optional)
- **URL**: http://localhost:5050
- **Email**: admin@freedomworld.com
- **Password**: admin123

## 🛠️ Docker Commands

### Basic Operations
```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Restart services
docker compose restart

# View logs
docker compose logs -f postgres
```

### Data Management
```bash
# Backup database
docker compose exec postgres pg_dump -U postgres freedom_world_db > backup.sql

# Restore database
docker compose exec -T postgres psql -U postgres freedom_world_db < backup.sql

# Connect to database directly
docker compose exec postgres psql -U postgres -d freedom_world_db
```

### Cleanup
```bash
# Stop and remove containers
docker compose down

# Remove containers and volumes (WARNING: This will delete all data!)
docker compose down -v

# Remove containers, volumes, and images
docker compose down -v --rmi all
```

## 🔧 Configuration

### Environment Variables
The `.env` file contains the database configuration:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/freedom_world_db"
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Custom Configuration
To modify the database configuration:

1. Edit the `docker-compose.yml` file
2. Update the `.env` file with new connection details
3. Restart the services: `docker compose down && docker compose up -d`

## 🔍 Troubleshooting

### Port Conflicts
If ports 5432 or 6379 are already in use:

```yaml
# In docker-compose.yml, change the host port:
ports:
  - "5433:5432"  # Use port 5433 instead of 5432
```

### Permission Issues
```bash
# Fix volume permissions (if needed)
sudo chown -R $USER:$USER ./postgres_data
```

### Database Connection Issues
```bash
# Check if PostgreSQL is accepting connections
docker compose exec postgres pg_isready -U postgres

# View PostgreSQL logs
docker compose logs postgres
```

### Reset Database
```bash
# Stop services and remove volumes
docker compose down -v

# Start services again (will recreate fresh database)
docker compose up -d

# Re-run migrations
npm run prisma:migrate
```

## 📝 Notes

- Data is persisted in Docker volumes, so it will survive container restarts
- The `init-scripts/` folder contains SQL scripts that run on first startup
- pgAdmin is optional and only starts with the `--profile tools` flag
- All services use a custom network for secure inter-service communication
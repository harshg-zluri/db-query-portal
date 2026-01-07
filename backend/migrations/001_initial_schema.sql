-- Database Query Portal Schema
-- PostgreSQL Migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'developer',
    managed_pod_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_role CHECK (role IN ('developer', 'manager', 'admin'))
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Database instances table
CREATE TABLE IF NOT EXISTS database_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    databases TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_type CHECK (type IN ('postgresql', 'mongodb'))
);

CREATE INDEX IF NOT EXISTS idx_database_instances_type ON database_instances(type);

-- Query requests table
CREATE TABLE IF NOT EXISTS query_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    user_email VARCHAR(255) NOT NULL,
    database_type VARCHAR(50) NOT NULL,
    instance_id UUID NOT NULL REFERENCES database_instances(id),
    instance_name VARCHAR(255) NOT NULL,
    database_name VARCHAR(255) NOT NULL,
    submission_type VARCHAR(50) NOT NULL,
    query TEXT,
    script_file_name VARCHAR(255),
    script_content TEXT,
    comments TEXT NOT NULL,
    pod_id VARCHAR(100) NOT NULL,
    pod_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approver_email VARCHAR(255),
    rejection_reason TEXT,
    execution_result TEXT,
    execution_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_database_type CHECK (database_type IN ('postgresql', 'mongodb')),
    CONSTRAINT valid_submission_type CHECK (submission_type IN ('query', 'script')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed'))
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON query_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON query_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_pod_id ON query_requests(pod_id);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON query_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status_pod ON query_requests(status, pod_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_query_requests_updated_at
    BEFORE UPDATE ON query_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- GEO Mock 数据库初始化脚本
-- 创建多个数据库以支持不同服务

-- 创建 GPT Interaction 数据库
CREATE DATABASE gpt_interaction;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE geo_mock TO postgres;
GRANT ALL PRIVILEGES ON DATABASE gpt_interaction TO postgres;

-- 连接到 geo_mock 数据库并创建扩展
\c geo_mock;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 连接到 gpt_interaction 数据库并创建扩展
\c gpt_interaction;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

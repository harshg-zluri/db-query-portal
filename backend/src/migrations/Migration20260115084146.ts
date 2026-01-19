import { Migration } from '@mikro-orm/migrations';

export class Migration20260115084146 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "database_instances" ("id" uuid not null, "name" varchar(255) not null, "type" text check ("type" in ('postgresql', 'mongodb')) not null, "host" varchar(255) not null, "port" int not null, "databases" text[] not null, "created_at" timestamptz not null, constraint "database_instances_pkey" primary key ("id"));`);

    this.addSql(`create table "query_requests" ("id" uuid not null, "user_id" varchar(255) not null, "user_email" varchar(255) not null, "database_type" text check ("database_type" in ('postgresql', 'mongodb')) not null, "instance_id" varchar(255) not null, "instance_name" varchar(255) not null, "database_name" varchar(255) not null, "submission_type" text check ("submission_type" in ('query', 'script')) not null, "query" text null, "script_file_name" varchar(255) null, "script_content" text null, "comments" text not null, "pod_id" varchar(255) not null, "pod_name" varchar(255) not null, "status" text check ("status" in ('pending', 'approved', 'rejected', 'executed', 'failed', 'withdrawn')) not null default 'pending', "approver_email" varchar(255) null, "rejection_reason" text null, "execution_result" text null, "execution_error" text null, "is_compressed" boolean not null default false, "executed_at" timestamptz null, "warnings" text[] null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "query_requests_pkey" primary key ("id"));`);

    this.addSql(`create table "users" ("id" uuid not null, "email" varchar(255) not null, "password" varchar(255) null, "name" varchar(255) not null, "role" text check ("role" in ('developer', 'manager', 'admin')) not null, "managed_pod_ids" text[] not null, "google_id" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "users_pkey" primary key ("id"));`);
    this.addSql(`alter table "users" add constraint "users_email_unique" unique ("email");`);
  }

}

CREATE TYPE user_role_enum AS ENUM ('USER','ADMIN');

CREATE TABLE
    public.user (
        id SERIAL PRIMARY KEY NOT NULL,
        name text NOT NULL,
        email text UNIQUE NOT NULL,
        password text NOT NULL,
        role user_role_enum DEFAULT 'USER',
        created_at timestamptz DEFAULT CLOCK_TIMESTAMP(),
        updated_at timestamptz DEFAULT CLOCK_TIMESTAMP(),
        is_deleted boolean NOT NULL DEFAULT false,
        deleted_at timestamptz DEFAULT NULL
    );

CREATE TYPE status_enum AS ENUM ('TODO','IN_PROGRESS','COMPLETED');

CREATE TABLE
    public.task (
        id SERIAL PRIMARY KEY NOT NULL,
        title text NOT NULL,
        task_status status_enum DEFAULT 'TODO',
        fk_user_id integer NOT NULL,
        created_at timestamptz DEFAULT CLOCK_TIMESTAMP(),
        updated_at timestamptz DEFAULT CLOCK_TIMESTAMP(),
        is_deleted boolean NOT NULL DEFAULT false,
        deleted_at timestamptz DEFAULT NULL
        -- No FK constraint: referential integrity handled at the app layer.
    );

CREATE TABLE
    public.map_parent_sub_task (
        id SERIAL PRIMARY KEY NOT NULL,
        fk_parent_task_id integer NOT NULL,
        fk_sub_task_id integer NOT NULL,
        is_deleted boolean NOT NULL DEFAULT false,
        deleted_at timestamptz DEFAULT NULL
        -- No FK constraints: mapping table + app layer own the relationship.
    );
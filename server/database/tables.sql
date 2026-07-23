CREATE TYPE user_role_enum AS ENUM ('USER','ADMIN');

CREATE TABLE
    public.user (
        id SERIAL PRIMARY KEY NOT NULL,
        name text NOT NULL,
        email text UNIQUE NOT NULL,
        password text NOT NULL,
        role user_role_enum DEFAULT 'USER',
        created_at timestamp WITHOUT TIME ZONE DEFAULT CLOCK_TIMESTAMP(),
        updated_at timestamp WITHOUT TIME ZONE DEFAULT CLOCK_TIMESTAMP(),
        deleted_at timestamp WITHOUT TIME ZONE DEFAULT NULL
    );

CREATE TYPE status_enum AS ENUM ('TODO','IN_PROGRESS','COMPLETED');

CREATE TABLE
    public.task (
        id SERIAL PRIMARY KEY NOT NULL,
        title text NOT NULL,
        task_status status_enum DEFAULT 'TODO',
        fk_user_id integer NOT NULL,
        created_at timestamp WITHOUT TIME ZONE DEFAULT CLOCK_TIMESTAMP(),
        updated_at timestamp WITHOUT TIME ZONE DEFAULT CLOCK_TIMESTAMP(),
        deleted_at timestamp WITHOUT TIME ZONE DEFAULT NULL,
        CONSTRAINT fk_task_user_id FOREIGN KEY (fk_user_id) REFERENCES PUBLIC.user (id) ON DELETE CASCADE
    );

CREATE TABLE
    public.map_parent_sub_task (
        id SERIAL PRIMARY KEY NOT NULL,
        fk_parent_task_id integer NOT NULL,
        fk_sub_task_id integer NOT NULL,
        deleted_at timestamp WITHOUT TIME ZONE DEFAULT NULL,
        CONSTRAINT fk_map_parent_task_id FOREIGN KEY (fk_parent_task_id) REFERENCES PUBLIC.task (id) ON DELETE CASCADE,
        CONSTRAINT fk_map_sub_task_id FOREIGN KEY (fk_sub_task_id) REFERENCES public.task (id) ON DELETE CASCADE
    );
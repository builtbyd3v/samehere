-- Catalog only. schedule() inserts a row with active=false and does not execute command.

create table if not exists cron.job (
  jobid bigint generated always as identity primary key,
  schedule text,
  command text,
  nodename text default 'localhost',
  nodeport integer default 5432,
  database text default current_database(),
  username text default current_user,
  active boolean default false,
  jobname text
);

create or replace function cron.schedule(p_job_name text, p_schedule text, p_command text)
returns bigint
language plpgsql
as $$
declare
  v_id bigint;
begin
  insert into cron.job (schedule, command, jobname, active)
  values (p_schedule, p_command, p_job_name, false)
  returning jobid into v_id;
  return v_id;
end;
$$;

create or replace function cron.unschedule(job_name text)
returns boolean
language plpgsql
as $$
begin
  delete from cron.job where cron.job.jobname = job_name;
  return found;
end;
$$;

create or replace function cron.unschedule(job_id bigint)
returns boolean
language plpgsql
as $$
begin
  delete from cron.job where cron.job.jobid = job_id;
  return found;
end;
$$;

revoke all on function cron.schedule(text, text, text) from public;
revoke all on function cron.unschedule(text) from public;
revoke all on function cron.unschedule(bigint) from public;
grant execute on function cron.schedule(text, text, text) to postgres;
grant execute on function cron.unschedule(text) to postgres;
grant execute on function cron.unschedule(bigint) to postgres;

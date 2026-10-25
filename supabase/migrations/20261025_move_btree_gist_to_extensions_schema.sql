-- Keep btree_gist outside the exposed public schema while retaining GiST exclusion constraints.
create schema if not exists extensions;
alter extension btree_gist set schema extensions;

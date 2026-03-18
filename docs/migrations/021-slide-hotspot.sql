alter table slides
    add column if not exists hotspot_x     float,
    add column if not exists hotspot_y     float,
    add column if not exists hotspot_title text not null default '',
    add column if not exists hotspot_body  text not null default '';

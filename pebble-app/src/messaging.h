#pragma once

#include <pebble.h>

// Message types (must match appinfo.json and pkjs/index.js)
#define MSG_TYPE    0
#define FILM_INDEX  1
#define FILM_COUNT  2
#define FILM_TITLE  3
#define FILM_TIME   4
#define FILM_IDX    5

#define TYPE_FILM_ITEM  0
#define TYPE_OPEN_IMDB  1
#define TYPE_DONE       2

#define MAX_FILMS    20
#define TITLE_LEN    31
#define TIME_LEN     13

typedef struct {
  char title[TITLE_LEN];
  char time[TIME_LEN];
} Film;

extern Film s_films[];
extern int s_film_count;
extern bool s_loading;

void messaging_init(void (*on_update)(void));
void messaging_deinit(void);
void messaging_request_open_imdb(int index);

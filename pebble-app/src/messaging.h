#pragma once

#include <pebble.h>

#define MSG_TYPE       0
#define FILM_INDEX     1
#define FILM_COUNT     2
#define FILM_TITLE     3
#define FILM_TIME      4
#define FILM_IDX       5
#define DETAIL_TITLE   6
#define DETAIL_RATING  7
#define DETAIL_RUNTIME 8
#define DETAIL_DESC    9

#define TYPE_FILM_ITEM    0
#define TYPE_DONE         2
#define TYPE_DETAIL_DATA  3

#define MAX_FILMS    20
#define TITLE_LEN    31
#define TIME_LEN     13
#define DETAIL_TITLE_LEN  64
#define DETAIL_FIELD_LEN  32
#define DETAIL_DESC_LEN   256

typedef struct {
  char title[TITLE_LEN];
  char time[TIME_LEN];
  char detail_title[DETAIL_TITLE_LEN];
  char rating[DETAIL_FIELD_LEN];
  char runtime[DETAIL_FIELD_LEN];
  char desc[DETAIL_DESC_LEN];
  bool has_detail;
} Film;

extern Film s_films[];
extern int s_film_count;
extern bool s_loading;

void messaging_init(void (*on_update)(void));
void messaging_deinit(void);

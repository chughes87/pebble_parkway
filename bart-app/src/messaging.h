#pragma once

#include <pebble.h>

#define MSG_TYPE     0
#define TRAIN_INDEX  1
#define TRAIN_COUNT  2
#define TRAIN_DEST   3
#define TRAIN_MINS   4
#define TRAIN_COLOR  5
#define TRAIN_IDX    6

#define TYPE_TRAIN_ITEM  0
#define TYPE_DONE        1
#define TYPE_REFRESH     2

#define MAX_TRAINS   20
#define DEST_LEN     31
#define MINS_LEN     13
#define COLOR_LEN    13

typedef struct {
  char dest[DEST_LEN];
  char mins[MINS_LEN];
  char color[COLOR_LEN];
} Train;

extern Train s_trains[];
extern int s_train_count;
extern bool s_loading;

void messaging_init(void (*on_update)(void));
void messaging_deinit(void);
void messaging_request_refresh(void);

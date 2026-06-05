#include "departure_list.h"
#include "messaging.h"

static MenuLayer *s_menu_layer;
static StatusBarLayer *s_status_bar;

static uint16_t menu_get_num_rows(MenuLayer *menu_layer, uint16_t section, void *data) {
  if (s_loading) return 1;
  if (s_train_count == 0) return 1;
  return s_train_count;
}

static void menu_draw_row(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
  if (s_loading) {
    menu_cell_basic_draw(ctx, cell_layer, "Loading...", NULL, NULL);
    return;
  }
  if (s_train_count == 0) {
    menu_cell_basic_draw(ctx, cell_layer, "No departures", NULL, NULL);
    return;
  }

  int idx = cell_index->row;
  if (idx < s_train_count) {
    menu_cell_basic_draw(ctx, cell_layer, s_trains[idx].dest, s_trains[idx].mins, NULL);
  }
}

static void menu_select_click(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
  // No-op: watch-to-phone messaging not supported on this hardware
}

void departure_list_init(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  s_status_bar = status_bar_layer_create();
  layer_add_child(window_layer, status_bar_layer_get_layer(s_status_bar));

  GRect menu_bounds = GRect(0, STATUS_BAR_LAYER_HEIGHT, bounds.size.w,
                            bounds.size.h - STATUS_BAR_LAYER_HEIGHT);
  s_menu_layer = menu_layer_create(menu_bounds);
  menu_layer_set_callbacks(s_menu_layer, NULL, (MenuLayerCallbacks){
    .get_num_rows = menu_get_num_rows,
    .draw_row = menu_draw_row,
    .select_click = menu_select_click,
  });
  menu_layer_set_click_config_onto_window(s_menu_layer, window);
  layer_add_child(window_layer, menu_layer_get_layer(s_menu_layer));
}

void departure_list_deinit(void) {
  menu_layer_destroy(s_menu_layer);
  status_bar_layer_destroy(s_status_bar);
}

void departure_list_reload(void) {
  menu_layer_reload_data(s_menu_layer);
}

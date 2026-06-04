#include "detail_view.h"

static Window *s_window;
static ScrollLayer *s_scroll_layer;
static TextLayer *s_text_layer;
static char s_buffer[512];

static void build_text(Film *film) {
  if (film->has_detail) {
    snprintf(s_buffer, sizeof(s_buffer),
      "%s\n\n%s  |  %s\n\n%s",
      film->detail_title,
      film->rating,
      film->runtime,
      film->desc);
  } else {
    snprintf(s_buffer, sizeof(s_buffer),
      "%s\n\n%s\n\nDetails not available",
      film->title,
      film->time);
  }
}

static void window_load(Window *window) {
  Film *film = window_get_user_data(window);
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  s_scroll_layer = scroll_layer_create(bounds);
  scroll_layer_set_click_config_onto_window(s_scroll_layer, window);

  s_text_layer = text_layer_create(GRect(4, 0, bounds.size.w - 8, 2000));
  text_layer_set_font(s_text_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18));
  text_layer_set_overflow_mode(s_text_layer, GTextOverflowModeWordWrap);

  build_text(film);
  text_layer_set_text(s_text_layer, s_buffer);

  GSize content_size = text_layer_get_content_size(s_text_layer);
  content_size.h += 10;
  text_layer_set_size(s_text_layer, content_size);
  scroll_layer_set_content_size(s_scroll_layer, content_size);

  scroll_layer_add_child(s_scroll_layer, text_layer_get_layer(s_text_layer));
  layer_add_child(window_layer, scroll_layer_get_layer(s_scroll_layer));
}

static void window_unload(Window *window) {
  text_layer_destroy(s_text_layer);
  scroll_layer_destroy(s_scroll_layer);
  window_destroy(s_window);
  s_window = NULL;
}

void detail_view_show(Film *film) {
  s_window = window_create();
  window_set_user_data(s_window, film);
  window_set_window_handlers(s_window, (WindowHandlers){
    .load = window_load,
    .unload = window_unload,
  });
  window_stack_push(s_window, true);
}

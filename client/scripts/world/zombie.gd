extends Node3D


@export var target_player_id: String
@export var word_label: String
@export var initial_word_label_container_position: Vector3


func from_dict(dict: Dictionary):
	target_player_id = dict.target_player_id
	word_label = dict.label
	$WordLabelContainer/ActiveWordLabel.text = ""
	$WordLabelContainer/NonActiveWordLabel.text = dict.label
	if $WordLabelContainer/ActiveWordLabel.font == null:
		$WordLabelContainer/ActiveWordLabel.font = SystemFont.new()
	if $WordLabelContainer/NonActiveWordLabel.font == null:
		$WordLabelContainer/NonActiveWordLabel.font = SystemFont.new()
	$WordLabelContainer.position.x -= get_non_active_word_label_width() / 2
	initial_word_label_container_position = $WordLabelContainer.position


func get_active_word_label_string_size(s: String = $WordLabelContainer/ActiveWordLabel.text):
	return $WordLabelContainer/ActiveWordLabel.font.get_string_size(
		s,
		$WordLabelContainer/ActiveWordLabel.horizontal_alignment,
		$WordLabelContainer/ActiveWordLabel.width,
		$WordLabelContainer/ActiveWordLabel.font_size,
	).x * $WordLabelContainer/ActiveWordLabel.pixel_size


func get_non_active_word_label_width(s: String = $WordLabelContainer/NonActiveWordLabel.text):
	return $WordLabelContainer/NonActiveWordLabel.font.get_string_size(
		s,
		$WordLabelContainer/NonActiveWordLabel.horizontal_alignment,
		$WordLabelContainer/NonActiveWordLabel.width,
		$WordLabelContainer/NonActiveWordLabel.font_size,
	).x * $WordLabelContainer/NonActiveWordLabel.pixel_size


func set_active(s: String):
	var non_active_word_label = word_label.trim_prefix(s)
	if non_active_word_label != word_label or s == "":
		$WordLabelContainer/ActiveWordLabel.text = s
		$WordLabelContainer/NonActiveWordLabel.text = non_active_word_label
		$WordLabelContainer.position.x = initial_word_label_container_position.x + get_active_word_label_string_size(s)

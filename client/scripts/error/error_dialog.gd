extends PanelContainer


@export var title: String:
	get:
		return $MarginContainer/HBoxContainer/VBoxContainer/Title.text
	set(value):
		$MarginContainer/HBoxContainer/VBoxContainer/Title.text = value
@export var content: String:
	get:
		return $MarginContainer/HBoxContainer/VBoxContainer/Content.text
	set(value):
		$MarginContainer/HBoxContainer/VBoxContainer/Content.text = value

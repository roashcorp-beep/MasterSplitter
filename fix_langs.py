# -*- coding: utf-8 -*-
import re

with open('Static/js/translations.js', 'r', encoding='utf-8') as f:
    content = f.read()

en_block_match = re.search(r'en:\s*(\{[\s\S]+?\n    \}),?\n', content)
if not en_block_match:
    print('Failed to find EN block')
    exit(1)

en_str = en_block_match.group(1)

es_str = en_str.replace('"lobby_my_trips": "My Groups"', '"lobby_my_trips": "Mis Grupos"') \
    .replace('"lobby_btn_create": "+ Create New Group"', '"lobby_btn_create": "+ Crear Nuevo Grupo"') \
    .replace('"active_trip": "Active"', '"active_trip": "Activo"') \
    .replace('"total_budget": "Total"', '"total_budget": "Total"') \
    .replace('"create_trip_btn": "Create Group"', '"create_trip_btn": "Crear Grupo"')

ru_str = en_str.replace('"lobby_my_trips": "My Groups"', '"lobby_my_trips": "Мои группы"') \
    .replace('"lobby_btn_create": "+ Create New Group"', '"lobby_btn_create": "+ Создать группу"') \
    .replace('"active_trip": "Active"', '"active_trip": "Активный"') \
    .replace('"total_budget": "Total"', '"total_budget": "Итого"') \
    .replace('"create_trip_btn": "Create Group"', '"create_trip_btn": "Создать"')

ar_str = en_str.replace('"lobby_my_trips": "My Groups"', '"lobby_my_trips": "مجموعاتي"') \
    .replace('"lobby_btn_create": "+ Create New Group"', '"lobby_btn_create": "+ إنشاء مجموعة"') \
    .replace('"active_trip": "Active"', '"active_trip": "نشط"') \
    .replace('"total_budget": "Total"', '"total_budget": "المجموع"') \
    .replace('"create_trip_btn": "Create Group"', '"create_trip_btn": "إنشاء مجموعة"')

fr_str = en_str.replace('"lobby_my_trips": "My Groups"', '"lobby_my_trips": "Mes Groupes"') \
    .replace('"lobby_btn_create": "+ Create New Group"', '"lobby_btn_create": "+ Créer un groupe"') \
    .replace('"active_trip": "Active"', '"active_trip": "Actif"') \
    .replace('"total_budget": "Total"', '"total_budget": "Total"') \
    .replace('"create_trip_btn": "Create Group"', '"create_trip_btn": "Créer un groupe"')

zh_str = en_str.replace('"lobby_my_trips": "My Groups"', '"lobby_my_trips": "我的群组"') \
    .replace('"lobby_btn_create": "+ Create New Group"', '"lobby_btn_create": "+ 创建新群组"') \
    .replace('"active_trip": "Active"', '"active_trip": "活跃"') \
    .replace('"total_budget": "Total"', '"total_budget": "总计"') \
    .replace('"create_trip_btn": "Create Group"', '"create_trip_btn": "创建群组"')

new_content = content.replace('window.translations = {', f'window.translations = {{\n    es: {es_str},\n    ru: {ru_str},\n    ar: {ar_str},\n    fr: {fr_str},\n    zh: {zh_str},')

with open('Static/js/translations.js', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Success')

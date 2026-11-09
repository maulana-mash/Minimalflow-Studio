import json
import os
from pathlib import Path

FONT_FAMILY = "'Book Antiqua', Palatino, serif"
FONT_SIZE = 10
IS_DARK = True

STROKE_COLOR = "#f4f4f5" if IS_DARK else "#18181b"
FILL_COLOR = "#18181b" if IS_DARK else "#ffffff"
TEXT_COLOR = "#f4f4f5" if IS_DARK else "#18181b"
SUB_FILL = "rgba(24, 24, 27, 0.45)" if IS_DARK else "rgba(250, 250, 250, 0.65)"
SUB_STROKE = "#3f3f46" if IS_DARK else "#d4d4d8"
SUB_TEXT_COLOR = "#a1a1aa" if IS_DARK else "#71717a"

def build_engineering_flowchart():
    """
    Menghasilkan Diagram Alur Rekayasa 8 Fase Mashimurelay Android
    Persis seperti pada screenshot arsitektur dan flowchart_interaktif_mashimurelay.html
    """
    nodes = {}
    edges = {}
    edge_idx = 1
    center_x = 420
    current_y = 60

    phases_def = [
        {
            "id": "FASE_01",
            "title": "FASE 1: Visualisasi & Desain Simbol Komponen",
            "nodes": [
                {"id": "p1_standarisasi", "type": "rectangle", "label": "Standarisasi Simbol IEC 60617 & NEMA\n(Benchmarking Simbol Internasional)", "width": 290, "height": 56},
                {"id": "p1_svg", "type": "rectangle", "label": "Digitalisasi: 117 Komponen Format Vektor (SVG)\n(viewBox 120x120 Relatif)", "width": 290, "height": 56}
            ],
            "internal_edges": [("p1_standarisasi", "p1_svg", "")]
        },
        {
            "id": "FASE_02",
            "title": "FASE 2: Arsitektur Data & Model Sirkuit",
            "nodes": [
                {"id": "p2_registry", "type": "rectangle", "label": "Native Component Registry\n(Pin-Oriented Bounding Box & O(1) Lookup)", "width": 290, "height": 56},
                {"id": "p2_models", "type": "rectangle", "label": "Struktur Data CadElement & Format Terstandarisasi\n(Serialisasi .smrl & Legacy .txt)", "width": 290, "height": 56}
            ],
            "internal_edges": [("p2_registry", "p2_models", "")]
        },
        {
            "id": "FASE_03",
            "title": "FASE 3: Mesin Kanvas CAD Native Android",
            "nodes": [
                {"id": "p3_canvas", "type": "rectangle", "label": "CadCanvasView (Android Custom View 60 FPS)\n(Matriks Transformasi 2D Virtual World)", "width": 290, "height": 56},
                {"id": "p3_snap", "type": "rectangle", "label": "Algoritma Snap-Grid Ortogonal Kelipatan 30px\n(Kuantisasi Koordinat Sub-Pixel)", "width": 290, "height": 56},
                {"id": "p3_routing", "type": "rectangle", "label": "Manhattan Wire Router (Jalur Siku 90 Derajat)\n(Routing Ortogonal Tanpa Sudut Miring)", "width": 290, "height": 56}
            ],
            "internal_edges": [("p3_canvas", "p3_snap", ""), ("p3_snap", "p3_routing", "")]
        },
        {
            "id": "FASE_04",
            "title": "FASE 4: Solver Sirkuit Topologi & Proteksi",
            "custom_layout": "branch_4",
            "nodes": [
                {"id": "p4_solver", "type": "rectangle", "label": "Topological Circuit Solver\n(BFS/DFS Adjacency Matrix 3-Fasa L1,L2,L3,PE,N)", "width": 310, "height": 56},
                {"id": "p4_decision", "type": "diamond", "label": "Evaluasi:\nTerdeteksi Hubung Singkat / Korsleting?", "width": 220, "height": 110},
                {"id": "p4_trip", "type": "rectangle", "label": "Trip Pengaman Elektrik (<16ms)\n(Spanduk Peringatan SHORT CIRCUIT!)", "width": 230, "height": 56},
                {"id": "p4_dynamics", "type": "rectangle", "label": "Dinamika Hub. Self-Holding KM1,\nTimer & Motor Induksi 3-Fasa 60 FPS", "width": 230, "height": 56}
            ]
        },
        {
            "id": "FASE_05",
            "title": "FASE 5: Komunikasi Lab & Pemindai Kode QR",
            "custom_layout": "branch_5",
            "nodes": [
                {"id": "p5_modal", "type": "rectangle", "label": "Floating Modal QR Scanner\n(ZXing Embedded 4.3 & Kamera Terintegrasi)", "width": 310, "height": 56},
                {"id": "p5_decision", "type": "diamond", "label": "Evaluasi:\nTipe Muatan QR Code?", "width": 220, "height": 110},
                {"id": "p5_import_direct", "type": "rectangle", "label": "Impor Sirkuit Mandiri\nLangsung ke Kanvas CAD (.smrl/.txt)", "width": 230, "height": 56},
                {"id": "p5_submit_teacher", "type": "rectangle", "label": "Pengiriman Tugas Siswa via HTTP POST\nke Server Guru di LAN (Hotspot Offline)", "width": 230, "height": 56}
            ]
        },
        {
            "id": "FASE_06",
            "title": "FASE 6: Generator Laporan PDF & Manajemen Penyimpanan",
            "nodes": [
                {"id": "p6_pdf", "type": "rectangle", "label": "NativePdfReportGenerator\n(Hal 1 Skematik CAD + Hal 2 Tabel BOM)", "width": 290, "height": 56},
                {"id": "p6_storage", "type": "rectangle", "label": "Dual Storage Scoped Engine (Android 10 - 15)\n(FileProvider App-Specific + MediaStore Downloads)", "width": 290, "height": 56},
                {"id": "p6_ui", "type": "rectangle", "label": "Modern Save As Dialog\n(Format Berkas Vektor .smrl, .txt, .pdf)", "width": 290, "height": 56}
            ],
            "internal_edges": [("p6_pdf", "p6_storage", ""), ("p6_storage", "p6_ui", "")]
        },
        {
            "id": "FASE_07",
            "title": "FASE 7: Pusat Instruksi Interaktif & Ensiklopedia",
            "nodes": [
                {"id": "p7_webview", "type": "rectangle", "label": "Hybrid Instruction Hub\n(Chromium WebView & WebSettings Otomatis)", "width": 290, "height": 56},
                {"id": "p7_encyclo", "type": "rectangle", "label": "Ensiklopedia 117 Komponen Elektroteknik\n(Filter Kategori, Pin I/O & Deskripsi Fisis)", "width": 290, "height": 56},
                {"id": "p7_video", "type": "rectangle", "label": "Pemutar Video Simulasi Mini\n(Autoplay Muted & Instant First Frame Decoding)", "width": 290, "height": 56}
            ],
            "internal_edges": [("p7_webview", "p7_encyclo", ""), ("p7_encyclo", "p7_video", "")]
        },
        {
            "id": "FASE_08",
            "title": "FASE 8: Kompilasi Rilis, Audit Memori & Distribusi",
            "custom_layout": "branch_8",
            "nodes": [
                {"id": "p8_decision", "type": "diamond", "label": "Evaluasi:\nZipalign 4-Byte Memori Lolos?", "width": 220, "height": 110},
                {"id": "p8_signing", "type": "rectangle", "label": "Penandatanganan SDK apksigner\n(Signature Scheme v2 & v3 Terverifikasi)", "width": 230, "height": 56},
                {"id": "p8_dist", "type": "rectangle", "label": "Pencerminan 0-Diff Repositori Ganda\n& Distribusi Mashimurelay.apk", "width": 230, "height": 56},
                {"id": "p8_gradle", "type": "rectangle", "label": "Kompilasi Ulang Gradle Akar APK\n(assembleDebug / Daemon)", "width": 220, "height": 56}
            ]
        }
    ]

    for phase in phases_def:
        phase_id = phase["id"]
        phase_title = phase["title"]
        container_id = f"subgraph_{phase_id}"
        c_layout = phase.get("custom_layout")

        if not c_layout:
            phase_nodes = phase["nodes"]
            startY = current_y + 42
            node_y = startY

            for n_def in phase_nodes:
                nid = n_def["id"]
                w = n_def["width"]
                h = n_def["height"]
                x = int(center_x - w / 2)
                y = node_y

                nodes[nid] = {
                    "id": nid, "type": n_def["type"],
                    "x": x, "y": y, "width": w, "height": h,
                    "rotation": 0, "locked": False, "groupId": phase_id,
                    "style": {"fill": FILL_COLOR, "stroke": STROKE_COLOR, "strokeWidth": 1.5},
                    "text": {
                        "content": n_def["label"], "fontFamily": FONT_FAMILY, "fontSize": FONT_SIZE,
                        "bold": False, "italic": False, "underline": False,
                        "color": TEXT_COLOR, "align": "center", "paddingX": 10, "paddingY": 8
                    }
                }
                node_y += h + 24

            for src, tgt, lbl in phase.get("internal_edges", []):
                eid = f"eng_edge_{edge_idx}"
                edge_idx += 1
                edges[eid] = {
                    "id": eid, "type": "step",
                    "source": {"nodeId": src, "pin": "S"},
                    "target": {"nodeId": tgt, "pin": "N"},
                    "handleOffset": {"dx": 0, "dy": 0}, "label": lbl,
                    "style": {"stroke": STROKE_COLOR, "strokeWidth": 1.5, "dashed": "solid", "markerStart": "none", "markerEnd": "arrow"}
                }

            box_w = 480
            box_h = (node_y - startY) + 38
            box_x = int(center_x - box_w / 2)
            box_y = current_y

            nodes[container_id] = {
                "id": container_id, "type": "rectangle",
                "x": box_x, "y": box_y, "width": box_w, "height": box_h,
                "rotation": 0, "locked": True, "isContainer": True,
                "style": {"fill": SUB_FILL, "stroke": SUB_STROKE, "strokeWidth": 1.5, "dashed": "dashed"},
                "text": {
                    "content": f"[ {phase_title.upper()} ]", "fontFamily": FONT_FAMILY, "fontSize": FONT_SIZE,
                    "bold": True, "italic": False, "underline": False,
                    "color": SUB_TEXT_COLOR, "align": "left", "paddingX": 16, "paddingY": 12
                }
            }
            current_y += box_h + 36

        elif c_layout in ("branch_4", "branch_5"):
            box_w = 640
            box_x = int(center_x - box_w / 2)
            box_y = current_y

            n_top = phase["nodes"][0]
            w_top, h_top = n_top["width"], n_top["height"]
            x_top = int(center_x - w_top / 2)
            y_top = current_y + 44
            nodes[n_top["id"]] = {
                "id": n_top["id"], "type": n_top["type"],
                "x": x_top, "y": y_top, "width": w_top, "height": h_top,
                "rotation": 0, "locked": False, "groupId": phase_id,
                "style": {"fill": FILL_COLOR, "stroke": STROKE_COLOR, "strokeWidth": 1.5},
                "text": {"content": n_top["label"], "fontFamily": FONT_FAMILY, "fontSize": FONT_SIZE, "bold": False, "italic": False, "underline": False, "color": TEXT_COLOR, "align": "center", "paddingX": 10, "paddingY": 8}
            }

            n_dec = phase["nodes"][1]
            w_dec, h_dec = n_dec["width"], n_dec["height"]
            x_dec = int(center_x - w_dec / 2)
            y_dec = y_top + h_top + 26
            nodes[n_dec["id"]] = {
                "id": n_dec["id"], "type": n_dec["type"],
                "x": x_dec, "y": y_dec, "width": w_dec, "height": h_dec,
                "rotation": 0, "locked": False, "groupId": phase_id,
                "style": {"fill": FILL_COLOR, "stroke": STROKE_COLOR, "strokeWidth": 1.5},
                "text": {"content": n_dec["label"], "fontFamily": FONT_FAMILY, "fontSize": FONT_SIZE, "bold": False, "italic": False, "underline": False, "color": TEXT_COLOR, "align": "center", "paddingX": 10, "paddingY": 8}
            }

            eid = f"eng_edge_{edge_idx}"
            edge_idx += 1
            edges[eid] = {
                "id": eid, "type": "step",
                "source": {"nodeId": n_top["id"], "pin": "S"},
                "target": {"nodeId": n_dec["id"], "pin": "N"},
                "handleOffset": {"dx": 0, "dy": 0}, "label": "",
                "style": {"stroke": STROKE_COLOR, "strokeWidth": 1.5, "dashed": "solid", "markerStart": "none", "markerEnd": "arrow"}
            }

            n_left = phase["nodes"][2]
            n_right = phase["nodes"][3]
            w_left, h_left = n_left["width"], n_left["height"]
            w_right, h_right = n_right["width"], n_right["height"]

            x_left = center_x - 170 - w_left / 2
            x_right = center_x + 170 - w_right / 2
            y_branch = y_dec + h_dec + 28

            nodes[n_left["id"]] = {
                "id": n_left["id"], "type": n_left["type"],
                "x": int(x_left), "y": int(y_branch), "width": w_left, "height": h_left,
                "rotation": 0, "locked": False, "groupId": phase_id,
                "style": {"fill": FILL_COLOR, "stroke": STROKE_COLOR, "strokeWidth": 1.5},
                "text": {"content": n_left["label"], "fontFamily": FONT_FAMILY, "fontSize": FONT_SIZE, "bold": False, "italic": False, "underline": False, "color": TEXT_COLOR, "align": "center", "paddingX": 10, "paddingY": 8}
            }

            nodes[n_right["id"]] = {
                "id": n_right["id"], "type": n_right["type"],
                "x": int(x_right), "y": int(y_branch), "width": w_right, "height": h_right,
                "rotation": 0, "locked": False, "groupId": phase_id,
                "style": {"fill": FILL_COLOR, "stroke": STROKE_COLOR, "strokeWidth": 1.5},
                "text": {"content": n_right["label"], "fontFamily": FONT_FAMILY, "fontSize": FONT_SIZE, "bold": False, "italic": False, "underline": False, "color": TEXT_COLOR, "align": "center", "paddingX": 10, "paddingY": 8}
            }

            lbl_left = "Korsleting (Ya)" if c_layout == "branch_4" else "Sirkuit Mandiri"
            lbl_right = "Normal (Tidak)" if c_layout == "branch_4" else "Tugas Guru (HTTP)"

            eid_l = f"eng_edge_{edge_idx}"
            edge_idx += 1
            edges[eid_l] = {
                "id": eid_l, "type": "step",
                "source": {"nodeId": n_dec["id"], "pin": "W"},
                "target": {"nodeId": n_left["id"], "pin": "N"},
                "handleOffset": {"dx": 0, "dy": 0}, "label": lbl_left,
                "style": {"stroke": STROKE_COLOR, "strokeWidth": 1.5, "dashed": "solid", "markerStart": "none", "markerEnd": "arrow"}
            }

            eid_r = f"eng_edge_{edge_idx}"
            edge_idx += 1
            edges[eid_r] = {
                "id": eid_r, "type": "step",
                "source": {"nodeId": n_dec["id"], "pin": "E"},
                "target": {"nodeId": n_right["id"], "pin": "N"},
                "handleOffset": {"dx": 0, "dy": 0}, "label": lbl_right,
                "style": {"stroke": STROKE_COLOR, "strokeWidth": 1.5, "dashed": "solid", "markerStart": "none", "markerEnd": "arrow"}
            }

            box_h = (y_branch + max(h_left, h_right) - box_y) + 32
            nodes[container_id] = {
                "id": container_id, "type": "rectangle",
                "x": box_x, "y": box_y, "width": box_w, "height": box_h,
                "rotation": 0, "locked": True, "isContainer": True,
                "style": {"fill": SUB_FILL, "stroke": SUB_STROKE, "strokeWidth": 1.5, "dashed": "dashed"},
                "text": {
                    "content": f"[ {phase_title.upper()} ]", "fontFamily": FONT_FAMILY, "fontSize": FONT_SIZE,
                    "bold": True, "italic": False, "underline": False,
                    "color": SUB_TEXT_COLOR, "align": "left", "paddingX": 16, "paddingY": 12
                }
            }
            current_y += box_h + 36

        elif c_layout == "branch_8":
            box_w = 640
            box_x = int(center_x - box_w / 2)
            box_y = current_y

            n_dec = phase["nodes"][0]
            w_dec, h_dec = n_dec["width"], n_dec["height"]
            x_dec = int(center_x - w_dec / 2)
            y_dec = current_y + 44
            nodes[n_dec["id"]] = {
                "id": n_dec["id"], "type": n_dec["type"],
                "x": x_dec, "y": y_dec, "width": w_dec, "height": h_dec,
                "rotation": 0, "locked": False, "groupId": phase_id,
                "style": {"fill": FILL_COLOR, "stroke": STROKE_COLOR, "strokeWidth": 1.5},
                "text": {"content": n_dec["label"], "fontFamily": FONT_FAMILY, "fontSize": FONT_SIZE, "bold": False, "italic": False, "underline": False, "color": TEXT_COLOR, "align": "center", "paddingX": 10, "paddingY": 8}
            }

            n_sign = phase["nodes"][1]
            n_dist = phase["nodes"][2]
            w_left = n_sign["width"]
            x_left = center_x - 170 - w_left / 2
            y_sign = y_dec + h_dec + 28
            y_dist = y_sign + n_sign["height"] + 24

            nodes[n_sign["id"]] = {
                "id": n_sign["id"], "type": n_sign["type"],
                "x": int(x_left), "y": int(y_sign), "width": w_left, "height": n_sign["height"],
                "rotation": 0, "locked": False, "groupId": phase_id,
                "style": {"fill": FILL_COLOR, "stroke": STROKE_COLOR, "strokeWidth": 1.5},
                "text": {"content": n_sign["label"], "fontFamily": FONT_FAMILY, "fontSize": FONT_SIZE, "bold": False, "italic": False, "underline": False, "color": TEXT_COLOR, "align": "center", "paddingX": 10, "paddingY": 8}
            }

            nodes[n_dist["id"]] = {
                "id": n_dist["id"], "type": n_dist["type"],
                "x": int(x_left), "y": int(y_dist), "width": w_left, "height": n_dist["height"],
                "rotation": 0, "locked": False, "groupId": phase_id,
                "style": {"fill": FILL_COLOR, "stroke": STROKE_COLOR, "strokeWidth": 1.5},
                "text": {"content": n_dist["label"], "fontFamily": FONT_FAMILY, "fontSize": FONT_SIZE, "bold": False, "italic": False, "underline": False, "color": TEXT_COLOR, "align": "center", "paddingX": 10, "paddingY": 8}
            }

            n_grad = phase["nodes"][3]
            w_grad = n_grad["width"]
            x_grad = center_x + 170 - w_grad / 2
            y_grad = y_dec + h_dec + 28

            nodes[n_grad["id"]] = {
                "id": n_grad["id"], "type": n_grad["type"],
                "x": int(x_grad), "y": int(y_grad), "width": w_grad, "height": n_grad["height"],
                "rotation": 0, "locked": False, "groupId": phase_id,
                "style": {"fill": FILL_COLOR, "stroke": STROKE_COLOR, "strokeWidth": 1.5},
                "text": {"content": n_grad["label"], "fontFamily": FONT_FAMILY, "fontSize": FONT_SIZE, "bold": False, "italic": False, "underline": False, "color": TEXT_COLOR, "align": "center", "paddingX": 10, "paddingY": 8}
            }

            eid = f"eng_edge_{edge_idx}"
            edge_idx += 1
            edges[eid] = {
                "id": eid, "type": "step",
                "source": {"nodeId": n_dec["id"], "pin": "W"},
                "target": {"nodeId": n_sign["id"], "pin": "N"},
                "handleOffset": {"dx": 0, "dy": 0}, "label": "Lolos (Exit Code 0)",
                "style": {"stroke": STROKE_COLOR, "strokeWidth": 1.5, "dashed": "solid", "markerStart": "none", "markerEnd": "arrow"}
            }

            eid = f"eng_edge_{edge_idx}"
            edge_idx += 1
            edges[eid] = {
                "id": eid, "type": "step",
                "source": {"nodeId": n_sign["id"], "pin": "S"},
                "target": {"nodeId": n_dist["id"], "pin": "N"},
                "handleOffset": {"dx": 0, "dy": 0}, "label": "",
                "style": {"stroke": STROKE_COLOR, "strokeWidth": 1.5, "dashed": "solid", "markerStart": "none", "markerEnd": "arrow"}
            }

            eid = f"eng_edge_{edge_idx}"
            edge_idx += 1
            edges[eid] = {
                "id": eid, "type": "step",
                "source": {"nodeId": n_dec["id"], "pin": "E"},
                "target": {"nodeId": n_grad["id"], "pin": "N"},
                "handleOffset": {"dx": 0, "dy": 0}, "label": "Gagal (Exit != 0)",
                "style": {"stroke": STROKE_COLOR, "strokeWidth": 1.5, "dashed": "solid", "markerStart": "none", "markerEnd": "arrow"}
            }

            eid = f"eng_edge_{edge_idx}"
            edge_idx += 1
            edges[eid] = {
                "id": eid, "type": "step",
                "source": {"nodeId": n_grad["id"], "pin": "E"},
                "target": {"nodeId": n_dec["id"], "pin": "E"},
                "handleOffset": {"dx": 20, "dy": 0}, "label": "Kompilasi Ulang",
                "style": {"stroke": STROKE_COLOR, "strokeWidth": 1.5, "dashed": "dashed", "markerStart": "none", "markerEnd": "arrow"}
            }

            box_h = (y_dist + n_dist["height"] - box_y) + 32
            nodes[container_id] = {
                "id": container_id, "type": "rectangle",
                "x": box_x, "y": box_y, "width": box_w, "height": box_h,
                "rotation": 0, "locked": True, "isContainer": True,
                "style": {"fill": SUB_FILL, "stroke": SUB_STROKE, "strokeWidth": 1.5, "dashed": "dashed"},
                "text": {
                    "content": f"[ {phase_title.upper()} ]", "fontFamily": FONT_FAMILY, "fontSize": FONT_SIZE,
                    "bold": True, "italic": False, "underline": False,
                    "color": SUB_TEXT_COLOR, "align": "left", "paddingX": 16, "paddingY": 12
                }
            }
            current_y += box_h + 36

    inter_phase_edges = [
        ("p1_svg", "p2_registry", ""),
        ("p2_models", "p3_canvas", ""),
        ("p3_routing", "p4_solver", ""),
        ("p4_dynamics", "p5_modal", "Kondisi Normal"),
        ("p5_submit_teacher", "p6_pdf", ""),
        ("p6_ui", "p7_webview", ""),
        ("p7_video", "p8_decision", "")
    ]

    for src, tgt, lbl in inter_phase_edges:
        eid = f"eng_edge_{edge_idx}"
        edge_idx += 1
        edges[eid] = {
            "id": eid, "type": "step",
            "source": {"nodeId": src, "pin": "S"},
            "target": {"nodeId": tgt, "pin": "N"},
            "handleOffset": {"dx": 0, "dy": 0},
            "label": lbl,
            "style": {"stroke": STROKE_COLOR, "strokeWidth": 1.5, "dashed": "solid", "markerStart": "none", "markerEnd": "arrow"}
        }

    total_height = current_y + 80
    total_width = 880

    return {
        "version": "1.5.0",
        "theme": "dark" if IS_DARK else "light",
        "canvas": {
            "pan": {"x": 50, "y": 50},
            "zoom": 0.60,
            "gridSize": 24,
            "workspace": {
                "preset": "custom_portrait",
                "orientation": "portrait",
                "x": 40, "y": 40,
                "width": total_width,
                "height": total_height
            }
        },
        "nodes": nodes,
        "edges": edges
    }

def build_runtime_flowchart(source_json_path):
    """
    Menghasilkan Diagram Alur Eksekusi Runtime Aplikasi Mashimurelay Android
    Berdasarkan node dan edges pada workflow_flowchart_mashimurelay.json
    """
    with open(source_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    raw_nodes = data['runtime_flowchart']['nodes']
    raw_edges = data['runtime_flowchart']['edges']

    # Klasifikasi 6 functional groups
    groups = {
        "GROUP_CORE": {
            "title": "INISIALISASI CAD & SIKLUS UTAMA (WORKSPACE LOOP)",
            "node_ids": ["START", "INIT_CAD", "LOAD_WORKSPACE", "WAIT_USER", "DECIDE_ACTION"]
        },
        "GROUP_EDIT": {
            "title": "MANIPULASI ELEMEN & WIRING KANVAS",
            "node_ids": ["ACT_EDIT", "SAVE_STATE"]
        },
        "GROUP_SIM": {
            "title": "MESIN SIMULASI ELEKTROMAGNETIK & PROTEKSI KORSLETING",
            "node_ids": ["ACT_SIM", "SOLVE_CIRCUIT", "CHECK_FAULT", "TRIP_PROTECTION", "RUN_DYNAMICS", "STOP_SIM"]
        },
        "GROUP_QR": {
            "title": "TELEMETRI QR CODE & PENGUMPULAN TUGAS LAB LAN",
            "node_ids": ["ACT_QR", "SHOW_QR_MODAL", "PARSE_QR", "QR_CIRCUIT", "LOAD_DIRECT", "QR_TEACHER", "SHOW_STUDENT_ID", "SUBMIT_TEACHER"]
        },
        "GROUP_SAVE": {
            "title": "GENERATOR DOKUMEN PDF & DUAL STORAGE",
            "node_ids": ["ACT_SAVE_EXPORT", "SHOW_SAVE_MODAL", "CHOOSE_FORMAT", "EXPORT_SMRL", "EXPORT_TXT", "EXPORT_PDF", "DUAL_STORAGE_SAVE", "OPEN_VIEWER"]
        },
        "GROUP_INST": {
            "title": "ENSIKLOPEDIA INTERAKTIF & VIDEO PLAYER",
            "node_ids": ["ACT_INSTRUCTIONS", "SHOW_INST_MODAL", "INST_SUBNAV", "VIEW_VIDEO", "VIEW_ENCYCLO", "VIEW_GUIDE"]
        }
    }

    node_map = {n['id']: n for n in raw_nodes}
    nodes = {}
    edges = {}

    # Layout Koordinat Kolom / Jalur
    # Kolom 0: Core Loop (x: 80 - 400)
    # Kolom 1: Edit & Save (x: 460 - 820)
    # Kolom 2: Sim & Proteksi (x: 880 - 1320)
    # Kolom 3: QR Telemetri (x: 1380 - 1820)
    # Kolom 4: Petunjuk & Video (x: 1880 - 2320)

    # 1. Core Track
    c0_x = 240
    core_y = 80
    for nid in groups["GROUP_CORE"]["node_ids"]:
        n = node_map[nid]
        ntype = "rounded" if n["type"] == "start_end" else ("diamond" if n["type"] == "decision" else "rectangle")
        w = 260 if ntype != "diamond" else 200
        h = 58 if ntype != "diamond" else 95
        nodes[nid] = {
            "id": nid, "type": ntype,
            "x": int(c0_x - w / 2), "y": core_y, "width": w, "height": h,
            "rotation": 0, "locked": False, "groupId": "GROUP_CORE",
            "style": {"fill": FILL_COLOR, "stroke": STROKE_COLOR, "strokeWidth": 1.5},
            "text": {"content": n["label"], "fontFamily": FONT_FAMILY, "fontSize": FONT_SIZE, "bold": False, "italic": False, "underline": False, "color": TEXT_COLOR, "align": "center", "paddingX": 10, "paddingY": 8}
        }
        core_y += h + 30

    nodes["subgraph_GROUP_CORE"] = {
        "id": "subgraph_GROUP_CORE", "type": "rectangle",
        "x": 80, "y": 40, "width": 320, "height": core_y - 20,
        "rotation": 0, "locked": True, "isContainer": True,
        "style": {"fill": SUB_FILL, "stroke": SUB_STROKE, "strokeWidth": 1.5, "dashed": "dashed"},
        "text": {"content": f"[ {groups['GROUP_CORE']['title']} ]", "fontFamily": FONT_FAMILY, "fontSize": FONT_SIZE, "bold": True, "italic": False, "underline": False, "color": SUB_TEXT_COLOR, "align": "left", "paddingX": 14, "paddingY": 10}
    }

    # Helper function to place vertical sequence in a column
    def place_column_group(gid, col_center_x, start_y, col_width=320):
        nonlocal nodes
        curr_y = start_y + 44
        g_def = groups[gid]
        for nid in g_def["node_ids"]:
            n = node_map[nid]
            ntype = "diamond" if n["type"] == "decision" else "rectangle"
            w = 250 if ntype != "diamond" else 190
            h = 56 if ntype != "diamond" else 92
            nodes[nid] = {
                "id": nid, "type": ntype,
                "x": int(col_center_x - w / 2), "y": curr_y, "width": w, "height": h,
                "rotation": 0, "locked": False, "groupId": gid,
                "style": {"fill": FILL_COLOR, "stroke": STROKE_COLOR, "strokeWidth": 1.5},
                "text": {"content": n["label"], "fontFamily": FONT_FAMILY, "fontSize": FONT_SIZE, "bold": False, "italic": False, "underline": False, "color": TEXT_COLOR, "align": "center", "paddingX": 10, "paddingY": 8}
            }
            curr_y += h + 24

        nodes[f"subgraph_{gid}"] = {
            "id": f"subgraph_{gid}", "type": "rectangle",
            "x": int(col_center_x - col_width / 2), "y": start_y, "width": col_width, "height": (curr_y - start_y) + 16,
            "rotation": 0, "locked": True, "isContainer": True,
            "style": {"fill": SUB_FILL, "stroke": SUB_STROKE, "strokeWidth": 1.5, "dashed": "dashed"},
            "text": {"content": f"[ {g_def['title']} ]", "fontFamily": FONT_FAMILY, "fontSize": FONT_SIZE, "bold": True, "italic": False, "underline": False, "color": SUB_TEXT_COLOR, "align": "left", "paddingX": 14, "paddingY": 10}
        }
        return curr_y + 36

    # 2. Edit Track (Kolom 1 - Atas)
    place_column_group("GROUP_EDIT", 620, 40, col_width=340)

    # 3. Save & PDF Export (Kolom 1 - Bawah)
    place_column_group("GROUP_SAVE", 620, 280, col_width=340)

    # 4. Simulation Track (Kolom 2)
    place_column_group("GROUP_SIM", 1020, 40, col_width=340)

    # 5. QR Telemetry Track (Kolom 3)
    place_column_group("GROUP_QR", 1420, 40, col_width=340)

    # 6. Interactive Instructions (Kolom 4)
    place_column_group("GROUP_INST", 1820, 40, col_width=340)

    # Tambahkan Edges
    edge_counter = 1
    for e in raw_edges:
        src = e["from"]
        tgt = e["to"]
        lbl = e.get("label", "")

        # Tentukan pin yang paling estetis
        src_node = nodes.get(src)
        tgt_node = nodes.get(tgt)
        
        src_pin = "S"
        tgt_pin = "N"

        if src_node and tgt_node:
            # Jika target berada di sebelah kiri atau kanan (lintas kolom)
            if src == "DECIDE_ACTION":
                src_pin = "E"
                tgt_pin = "W"
            elif tgt == "WAIT_USER":
                src_pin = "W"
                tgt_pin = "E"
            elif abs(src_node["x"] - tgt_node["x"]) > 100:
                src_pin = "E" if tgt_node["x"] > src_node["x"] else "W"
                tgt_pin = "W" if tgt_node["x"] > src_node["x"] else "E"

        eid = f"run_edge_{edge_counter}"
        edge_counter += 1
        edges[eid] = {
            "id": eid, "type": "step",
            "source": {"nodeId": src, "pin": src_pin},
            "target": {"nodeId": tgt, "pin": tgt_pin},
            "handleOffset": {"dx": 0, "dy": 0}, "label": lbl,
            "style": {"stroke": STROKE_COLOR, "strokeWidth": 1.5, "dashed": "solid" if tgt != "WAIT_USER" else "dashed", "markerStart": "none", "markerEnd": "arrow"}
        }

    return {
        "version": "1.5.0",
        "theme": "dark" if IS_DARK else "light",
        "canvas": {
            "pan": {"x": 50, "y": 50},
            "zoom": 0.55,
            "gridSize": 24,
            "workspace": {
                "preset": "16:9_landscape",
                "orientation": "landscape",
                "x": 40, "y": 40,
                "width": 2100,
                "height": 1150
            }
        },
        "nodes": nodes,
        "edges": edges
    }

def convert_to_mermaid(doc_dict):
    """Mengonversi dokumen MinimalFlow JSON ke sintaks Mermaid .mmd murni"""
    lines = ["flowchart TD"]
    nodes = doc_dict["nodes"]
    edges = doc_dict["edges"]

    # Filter container vs regular nodes
    containers = {k: v for k, v in nodes.items() if v.get("isContainer")}
    regular_nodes = {k: v for k, v in nodes.items() if not v.get("isContainer")}

    # Kelompokkan node ke dalam subgraphs
    subgraph_map = {}
    ungrouped = []
    for nid, n in regular_nodes.items():
        gid = n.get("groupId")
        if gid:
            subgraph_map.setdefault(gid, []).append((nid, n))
        else:
            ungrouped.append((nid, n))

    for gid, member_list in subgraph_map.items():
        c_title = gid
        # Cari judul container jika ada
        c_node = containers.get(f"subgraph_{gid}")
        if c_node:
            t_content = c_node["text"]["content"].strip("[] ")
            c_title = t_content

        lines.append(f'    subgraph {gid} ["{c_title}"]')
        for nid, n in member_list:
            lbl = n["text"]["content"].replace('"', "'").replace("\n", "<br/>")
            ntype = n["type"]
            if ntype == "diamond":
                lines.append(f'        {nid}{{"{lbl}"}}')
            elif ntype == "rounded":
                lines.append(f'        {nid}(["{lbl}"])')
            elif ntype == "circle":
                lines.append(f'        {nid}(("{lbl}"))')
            else:
                lines.append(f'        {nid}["{lbl}"]')
        lines.append("    end\n")

    for nid, n in ungrouped:
        lbl = n["text"]["content"].replace('"', "'").replace("\n", "<br/>")
        ntype = n["type"]
        if ntype == "diamond":
            lines.append(f'    {nid}{{"{lbl}"}}')
        elif ntype == "rounded":
            lines.append(f'    {nid}(["{lbl}"])')
        else:
            lines.append(f'    {nid}["{lbl}"]')

    lines.append("")
    for eid, e in edges.items():
        src = e["source"]["nodeId"]
        tgt = e["target"]["nodeId"]
        lbl = e.get("label", "").strip()
        if lbl:
            lbl_clean = lbl.replace('"', "'")
            lines.append(f'    {src} -->|"{lbl_clean}"| {tgt}')
        else:
            lines.append(f'    {src} --> {tgt}')

    return "\n".join(lines)

def build_master_flowchart(eng_flow, run_flow):
    """Menggabungkan Alur Rekayasa & Alur Runtime berdampingan dalam satu kanvas Master"""
    master_nodes = {}
    master_edges = {}

    # 1. Tambahkan node rekayasa (Kolom Kiri)
    for nid, n in eng_flow["nodes"].items():
        mid = f"eng_{nid}"
        mn = dict(n)
        mn["id"] = mid
        if n.get("groupId"):
            mn["groupId"] = f"eng_{n['groupId']}"
        master_nodes[mid] = mn

    for eid, e in eng_flow["edges"].items():
        mid = f"eng_{eid}"
        me = dict(e)
        me["id"] = mid
        me["source"] = {"nodeId": f"eng_{e['source']['nodeId']}", "pin": e["source"]["pin"]}
        me["target"] = {"nodeId": f"eng_{e['target']['nodeId']}", "pin": e["target"]["pin"]}
        master_edges[mid] = me

    # 2. Tambahkan node runtime (Kolom Kanan, offset X: 940)
    offset_x = 940
    for nid, n in run_flow["nodes"].items():
        mid = f"run_{nid}"
        mn = dict(n)
        mn["id"] = mid
        mn["x"] = n["x"] + offset_x
        if n.get("groupId"):
            mn["groupId"] = f"run_{n['groupId']}"
        master_nodes[mid] = mn

    for eid, e in run_flow["edges"].items():
        mid = f"run_{eid}"
        me = dict(e)
        me["id"] = mid
        me["source"] = {"nodeId": f"run_{e['source']['nodeId']}", "pin": e["source"]["pin"]}
        me["target"] = {"nodeId": f"run_{e['target']['nodeId']}", "pin": e["target"]["pin"]}
        master_edges[mid] = me

    return {
        "version": "1.5.0",
        "theme": "dark" if IS_DARK else "light",
        "canvas": {
            "pan": {"x": 40, "y": 40},
            "zoom": 0.45,
            "gridSize": 24,
            "workspace": {
                "preset": "16:9_landscape",
                "orientation": "landscape",
                "x": 40, "y": 40,
                "width": 3150,
                "height": 2850
            }
        },
        "nodes": master_nodes,
        "edges": master_edges
    }

def main():
    root_dir = Path(__file__).resolve().parent.parent
    simurelay_dir = Path(r"d:\Game Mash_\Antigravity Project\Mashimurelay-Simurelay")
    source_json = simurelay_dir / "workflow_flowchart_mashimurelay.json"

    print(f"[*] Membaca berkas sumber: {source_json}")

    # 1. Bangun Diagram Alur Rekayasa (8 Fase sesuai gambar)
    print("[*] Mengompilasi Alur Rekayasa 8 Fase (Engineering Workflow)...")
    eng_flow = build_engineering_flowchart()
    eng_mmd = convert_to_mermaid(eng_flow)

    # 2. Bangun Diagram Alur Runtime Aplikasi
    print("[*] Mengompilasi Alur Eksekusi Runtime (Runtime Flowchart)...")
    run_flow = build_runtime_flowchart(source_json)
    run_mmd = convert_to_mermaid(run_flow)

    # 3. Bangun Diagram Alur Master Terpadu (Unified Master Workflow)
    print("[*] Mengompilasi Master Workflow Terpadu (Engineering + Runtime)...")
    master_flow = build_master_flowchart(eng_flow, run_flow)
    master_mmd = convert_to_mermaid(master_flow)

    # 4. Tentukan Target Penyimpanan di Kedua Proyek
    destinations = [
        simurelay_dir,
        root_dir
    ]

    for dest in destinations:
        dest.mkdir(parents=True, exist_ok=True)

        # Simpan Engineering Flowchart
        p_eng_json = dest / "workflow_engineering_mashimurelay.flow.json"
        p_eng_mmd = dest / "workflow_engineering_mashimurelay.mmd"
        p_eng_json.write_text(json.dumps(eng_flow, indent=2, ensure_ascii=False), encoding="utf-8")
        p_eng_mmd.write_text(eng_mmd, encoding="utf-8")

        # Simpan Runtime Flowchart
        p_run_json = dest / "workflow_runtime_mashimurelay.flow.json"
        p_run_mmd = dest / "workflow_runtime_mashimurelay.mmd"
        p_run_json.write_text(json.dumps(run_flow, indent=2, ensure_ascii=False), encoding="utf-8")
        p_run_mmd.write_text(run_mmd, encoding="utf-8")

        # Simpan Master Unified Flowchart
        p_master_json = dest / "workflow_master_mashimurelay.flow.json"
        p_master_mmd = dest / "workflow_master_mashimurelay.mmd"
        p_master_json.write_text(json.dumps(master_flow, indent=2, ensure_ascii=False), encoding="utf-8")
        p_master_mmd.write_text(master_mmd, encoding="utf-8")

        print(f"[+] Berhasil disimpan di: {dest}")
        print(f"    - {p_eng_json.name} ({len(eng_flow['nodes'])} node, {len(eng_flow['edges'])} edge)")
        print(f"    - {p_run_json.name} ({len(run_flow['nodes'])} node, {len(run_flow['edges'])} edge)")
        print(f"    - {p_master_json.name} ({len(master_flow['nodes'])} node, {len(master_flow['edges'])} edge)")

    print("\n[V] Semua berkas diagram alur Book Antiqua 10px sukses dibuat!")

if __name__ == "__main__":
    main()


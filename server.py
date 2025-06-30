from flask import Flask, Response, request
from flask_cors import CORS
import sqlite3
from zipfile import ZipFile
import zipfile
import io
import json
import random
import bcrypt

app = Flask(__name__)
CORS(app, origins="*")

PAGE_SIZE = 50

def gen_rand_str(n: int = 10):
    symbols = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
    return "".join([random.choice(symbols) for _ in range(n)])


@app.get("/charts/<int:page>")
def get_charts(page: int):
    with sqlite3.connect("data/chuuni.db") as conn:
        cursor = conn.cursor()
        
        count = cursor.execute("SELECT COUNT(*) FROM charts").fetchone()[0]
        
        charts = cursor.execute(
            "SELECT id, title, bpm FROM charts LIMIT ? OFFSET ?", 
            (PAGE_SIZE, PAGE_SIZE * page)
        ).fetchall()
        
        return [count, charts]

@app.post("/charts")
def upload_chart():
    with ZipFile(io.BytesIO(request.data)) as zip:
        metadata = json.loads(zip.read("metadata.json"))
        
        id = gen_rand_str()
        deletion_key = random.randbytes(32)
        hashed_deletion_key = bcrypt.hashpw(deletion_key, bcrypt.gensalt())
        
        # copy chart/audio/img files to chart folder
        files_to_extract = [
            "chart.txt",
            "audio." + metadata["audio_ext"],
        ]
        if metadata["img_ext"]:
            files_to_extract.append("img." + metadata["img_ext"])
        zip.extractall(f"data/charts/{id}", files_to_extract)
        
        # insert metadata as sqlite3 row
        with sqlite3.connect("data/chuuni.db") as conn:
            conn.cursor().execute(
                "INSERT INTO charts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
                (
                    id,
                    metadata["title"],
                    metadata["bpm"],
                    metadata["measure_size"],
                    metadata["snaps"],
                    metadata["audio_ext"],
                    getattr(metadata, "img_ext", None),
                    getattr(metadata, "credit_audio", None),
                    getattr(metadata, "credit_img", None),
                    getattr(metadata, "credit_chart", None),
                    hashed_deletion_key
                )
            )
        
        return [id, deletion_key.hex()]

@app.delete("/charts/<id>")
def delete_chart(id: str):
    deletion_key = request.data
    
    with sqlite3.connect("data/chuuni.db") as conn:
        cursor = conn.cursor()
        
        row = cursor.execute("SELECT deletion_key FROM charts WHERE id=?", id).fetchone()
        if row is None:
            return Response(status=404)
        
        hashed_key: bytes = row[0]
        
        if bcrypt.checkpw(deletion_key, hashed_key):
            cursor.execute("DELETE FROM charts WHERE id=?", id)
            return Response(status=200)
        else:
            return Response(status=401)

@app.get("/download/<id>")
def download_chart(id: str):
    with sqlite3.connect("data/chuuni.db") as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        row = cursor.execute("SELECT * FROM charts WHERE id=?", (id,)).fetchone()
        if row is None:
            return Response(status=404)
        
        metadata = json.dumps({
            "id": row["id"],
            "title": row["title"],
            "bpm": row["bpm"],
            "measure_size": row["measure_size"],
            "snaps": row["snaps"],
            "audio_ext": row["audio_ext"],
            "img_ext": getattr(row, "img_ext", None),
            "credit_audio": getattr(row, "credit_audio", None),
            "credit_img": getattr(row, "credit_img", None),
            "credit_chart": getattr(row, "credit_chart", None),
        })
    
    zip_buffer = io.BytesIO()
    with ZipFile(zip_buffer, mode="w") as zip:
        zip.writestr("metadata.json", metadata)
        zip.write(f"data/charts/{id}/chart.txt", "chart.txt")
        zip.write(f"data/charts/{id}/audio.{row['audio_ext']}", f"audio.{row['audio_ext']}")
        if row["img_ext"]:
            zip.write(f"data/charts/{id}/img.{row['img_ext']}", f"img.{row['img_ext']}")
    
    return zip_buffer.getvalue()
    

if __name__ == "__main__":
    app.run(debug=True)
import sys

def sanitize_file(file_path):
    with open(file_path, 'rb') as f:
        content = f.read()
    
    # Replacement mapping for garbled text
    # Note: These are bytes-based replacements because the '?' might represent 
    # different bytes depending on how it was saved.
    # However, since the user's error message shows actual garbled text like '?뱀떊?€',
    # I will try to match the strings as they appear in the view_file output.
    
    text = content.decode('utf-8', errors='replace')
    
    replacements = {
        '?뺥삎': '정형',
        '?대찓??': '이메일',
        '臾몄꽌': '문서',
        '湲고?': '기타',
        '?대? 洹쒖젙 諛??곗씠???섏쭛 以?..': '내부 규정 및 데이터 수집 중...',
        '援먯감 遺꾩꽍 湲곕컲 媛먯궗媛€ ?꾨즺?섏뿀?듬땲??': '교차 분석 기반 감사가 완료되었습니다.',
        '誘몃━蹂닿린瑜?吏€?먰븯吏€ ?딅뒗 ?뺤떇?낅땲??': '미리보기를 지원하지 않는 형식입니다.',
        '誘몃텇瑜?': '미분류',
        '?쒖뒪???쒓났': '시스템 제공',
        '洹쒖젙': '규정',
        '留ㅻ돱??': '매뉴얼',
        '?몄궗': '인사',
        '吏곸썝': '직원',
        '踰뺤씤移대뱶': '법인카드',
        '嫄곕옒': '거래',
        '?곗씠??': '데이터',
        '?꾪솴': '현황',
        '?뱀떊?€': '당신은',
        '湲곗뾽??': '기업의',
        '理쒓퀬 媛먯궗 梨낆엫??': '최고 감사 책임자',
        '?땲??': '입니다.',
        'CEO瑜?': 'CEO를',
        '?꾪븳': '위한',
        '?곌컙 媛먯궗 寃쎌쁺 ?붿빟 蹂닿퀬??瑜?': '연간 감사 경영 요약 보고서를',
        '?묒꽦?섏떗?쒖삤.': '작성하십시오.',
        '?쒓났???듦퀎:': '제공된 통계:',
        '珥?諛쒓껄 ?댁뒋:': '총 발견 이슈:',
        '怨좎쐞???댁뒋:': '고위험 이슈:',
        '二쇱슂 痍⑥빟 ?곸뿭:': '주요 취약 영역:',
        '?붽뎄?ы빆:': '요구사항:',
        '?ы빐??媛먯궗 ?몃젋?쒕? 遺꾩꽍?섏떗?쒖삤.': '당해년도 감사 트렌드를 분석하십시오.',
        '諛쒓껄??媛€????由ъ뒪???붿씤??吏€?곹븯??떆??': '발견된 가장 큰 리스크 요인을 지적하십시오.',
        '?대뀈??媛먯궗 ?꾨왂 ?섎┰???ꪪ듭떖 以묒젏 遺꾩빞瑜??쒖븞?섏떗?쒖삤.': '내년도 감사 전략 수립을 위한 핵심 중점 분야를 제안하십시오.',
        '?꾨Ц?곸씠怨??꾨왂?곸씤 ?ㅼ쓣 ?좎??섎ŉ ?쒓뎅?대줈 ?묒꽦?섏떗?쒖삤.': '전문적이고 전략적인 톤을 유지하며 한국어로 작성하십시오.',
        'Markdown ?뺤떇???ъ슜?섏꽭??': 'Markdown 형식을 사용하세요.',
        '???듦퀎瑜?諛뷀깢?쇰줈 ?곌컙 蹂닿퀬?쒕? ?묒꽦?댁쨾.': '위 통계를 바탕으로 연간 보고서를 작성해줘.',
        'AI Insight ?앹꽦 ?ㅽ뙣:': 'AI Insight 생성 실패:',
        '?대??': '이미',
        '?뚯씪': '파일',
        '?뚯씠釉?': '테이블',
        '諛쒓껄???댁뒋': '발견된 이슈',
        '而щ읆 異붽?': '컬럼 추가',
        '??': '건',
        '?앹꽦': '생성',
        '?ㅽ뙣': '실패',
        '?묒꽦': '작성',
        '蹂닿퀬??': '보고서',
        '?섏쭛': '수집',
        '援먯감': '교차',
        '遺꾩꽍': '분석',
        '?꾨즺': '완료',
        '?곗씠??': '데이터',
        '?몄궗': '인사',
        '吏곸썝': '직원',
        '踰뺤씤移대뱶': '법인카드',
        '留ㅻ돱??': '매뉴얼',
        '洹쒖젙': '규정',
        '?꾪솴': '현황',
    }
    
    for garbled, correct in replacements.items():
        text = text.replace(garbled, correct)
    
    # Fix the year placeholder issue in system_prompt
    text = text.replace("{year}???", "{year}년 ")
    
    # Final check for some specific blocks
    text = text.replace('format!("{} ({}嫄?", d, c)', 'format!("{} ({}건)", d, c)')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Sanitization successful.")

if __name__ == "__main__":
    sanitize_file(sys.argv[1])

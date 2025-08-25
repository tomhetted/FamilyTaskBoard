package ru.smirnovjavadev.service;

import org.springframework.stereotype.Service;
import ru.smirnovjavadev.domain.Household;
import ru.smirnovjavadev.domain.Member;
import ru.smirnovjavadev.repository.HouseholdRepository;
import ru.smirnovjavadev.repository.MemberRepository;

import java.util.List;

@Service
public class MemberService {

    private final MemberRepository memberRepository;
    private final HouseholdRepository householdRepository;

    public MemberService(MemberRepository memberRepository, HouseholdRepository householdRepository) {
        this.memberRepository = memberRepository;
        this.householdRepository = householdRepository;
    }

    // Получить участника по ID
    public Member getById(Long id) {
        return memberRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));
    }

    // Создать участника, привязанного к household
    public Member create(Long householdId, String name) {
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new IllegalArgumentException("Household not found"));

        Member member = new Member();
        member.setName(name);
        member.setHousehold(household);

        return memberRepository.save(member);
    }

    // Получить всех участников
    public List<Member> getAll() {
        return memberRepository.findAll();
    }

    // Получить всех участников конкретного household
    public List<Member> getAllByHousehold(Long householdId) {
        return memberRepository.findAllByHouseholdId(householdId);
    }
}
